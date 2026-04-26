/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query GetProjects {\n    projects {\n      id\n      name\n      createdAt\n      updatedAt\n    }\n  }\n": typeof types.GetProjectsDocument,
    "\n  query GetProject($id: ID!) {\n    project(id: $id) {\n      id\n      name\n      createdAt\n      updatedAt\n      workstreams {\n        id\n        title\n        status\n        isPinned\n        messageCount\n        lastActivityAt\n      }\n    }\n  }\n": typeof types.GetProjectDocument,
    "\n  mutation CreateProject($input: CreateProjectInput!) {\n    createProject(input: $input) {\n      id\n      name\n      createdAt\n      updatedAt\n    }\n  }\n": typeof types.CreateProjectDocument,
    "\n  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {\n    updateProject(id: $id, input: $input) {\n      id\n      name\n      updatedAt\n    }\n  }\n": typeof types.UpdateProjectDocument,
    "\n  mutation DeleteProject($id: ID!) {\n    deleteProject(id: $id)\n  }\n": typeof types.DeleteProjectDocument,
    "\n  query GetWorkstreamsByProject($projectId: ID!) {\n    workstreamsByProject(projectId: $projectId) {\n      id\n      title\n      status\n      model\n      isPinned\n      isRoutineWorkstream\n      groupId\n      messageCount\n      lastActivityAt\n      createdAt\n      updatedAt\n      inFocus\n    }\n  }\n": typeof types.GetWorkstreamsByProjectDocument,
    "\n  query GetWorkstream($id: ID!) {\n    workstream(id: $id) {\n      id\n      title\n      status\n      model\n      isPinned\n      messageCount\n      lastActivityAt\n      createdAt\n      updatedAt\n      project {\n        id\n        name\n      }\n    }\n  }\n": typeof types.GetWorkstreamDocument,
    "\n  query GetArchivedWorkstreams($projectId: ID!) {\n    archivedWorkstreams(projectId: $projectId) {\n      id\n      title\n      status\n      messageCount\n      archivedAt\n      updatedAt\n    }\n  }\n": typeof types.GetArchivedWorkstreamsDocument,
    "\n  mutation CreateWorkstream($input: CreateWorkstreamInput!) {\n    createWorkstream(input: $input) {\n      workstream { id title status model isPinned messageCount createdAt }\n    }\n  }\n": typeof types.CreateWorkstreamDocument,
    "\n  mutation ForkWorkstream($input: ForkWorkstreamInput!) {\n    forkWorkstream(input: $input) {\n      workstream { id title status model isPinned messageCount createdAt groupId }\n      worktrees { directoryPath branch worktreePath error }\n    }\n  }\n": typeof types.ForkWorkstreamDocument,
    "\n  mutation UpdateWorkstream($id: ID!, $input: UpdateWorkstreamInput!) {\n    updateWorkstream(id: $id, input: $input) {\n      workstream { id title status model isPinned updatedAt }\n    }\n  }\n": typeof types.UpdateWorkstreamDocument,
    "\n  mutation ArchiveWorkstream($id: ID!) {\n    archiveWorkstream(id: $id) {\n      workstream { id status archivedAt updatedAt }\n    }\n  }\n": typeof types.ArchiveWorkstreamDocument,
    "\n  mutation UnarchiveWorkstream($id: ID!) {\n    unarchiveWorkstream(id: $id) {\n      workstream { id status archivedAt updatedAt }\n    }\n  }\n": typeof types.UnarchiveWorkstreamDocument,
    "\n  mutation PinWorkstream($id: ID!) {\n    pinWorkstream(id: $id) {\n      workstream { id isPinned }\n    }\n  }\n": typeof types.PinWorkstreamDocument,
    "\n  mutation UnpinWorkstream($id: ID!) {\n    unpinWorkstream(id: $id) {\n      workstream { id isPinned }\n    }\n  }\n": typeof types.UnpinWorkstreamDocument,
    "\n  mutation DeleteWorkstream($id: ID!) {\n    deleteWorkstream(id: $id) {\n      workstream { id }\n    }\n  }\n": typeof types.DeleteWorkstreamDocument,
    "\n  query GetEntity($uri: String!) {\n    entity(uri: $uri) {\n      id\n      type\n      uri\n      title\n      description\n      createdAt\n      updatedAt\n    }\n  }\n": typeof types.GetEntityDocument,
    "\n  query GetEntities($type: String!, $query: String, $filters: JSON, $limit: Int) {\n    entities(type: $type, query: $query, filters: $filters, limit: $limit) {\n      id\n      type\n      uri\n      title\n      description\n      createdAt\n      updatedAt\n    }\n  }\n": typeof types.GetEntitiesDocument,
    "\n  query SearchEntities($query: String!, $types: [String!], $limit: Int) {\n    entitySearch(query: $query, types: $types, limit: $limit) {\n      id\n      type\n      uri\n      title\n      description\n      createdAt\n      updatedAt\n    }\n  }\n": typeof types.SearchEntitiesDocument,
    "\n  query GetEntityTypes {\n    entityTypes {\n      type\n      displayName\n      icon\n      source\n      uriExample\n      display\n    }\n  }\n": typeof types.GetEntityTypesDocument,
    "\n  query GetEntityMutationCatalog {\n    entityMutationCatalog {\n      entityType\n      entityDisplayName\n      mutations {\n        name\n        description\n        entityType\n      }\n    }\n  }\n": typeof types.GetEntityMutationCatalogDocument,
    "\n  query GetRoutines {\n    routines {\n      id\n      name\n      description\n      workstreamId\n      status\n      schedule { type expression timezone }\n      runCount\n      lastRunAt\n      nextRunAt\n      createdAt\n      updatedAt\n      latestRun { id status triggeredBy startedAt completedAt }\n    }\n  }\n": typeof types.GetRoutinesDocument,
    "\n  query GetRoutinesByProject($projectId: ID!) {\n    routinesByProject(projectId: $projectId) {\n      id\n      name\n      description\n      workstreamId\n      status\n      schedule { type expression timezone }\n      runCount\n      lastRunAt\n      nextRunAt\n      createdAt\n      updatedAt\n      latestRun { id status triggeredBy startedAt completedAt }\n    }\n  }\n": typeof types.GetRoutinesByProjectDocument,
    "\n  query GetRoutine($id: ID!) {\n    routine(id: $id) {\n      id\n      name\n      description\n      prompt\n      workstreamId\n      status\n      schedule { type expression timezone }\n      preferences\n      runCount\n      lastRunAt\n      nextRunAt\n      createdAt\n      updatedAt\n      workstream { id title status }\n      latestRun { id status triggeredBy startedAt completedAt summary error }\n    }\n  }\n": typeof types.GetRoutineDocument,
    "\n  query GetRoutineByWorkstream($workstreamId: ID!) {\n    routineByWorkstreamId(workstreamId: $workstreamId) {\n      id\n      name\n      description\n      prompt\n      status\n      schedule { type expression timezone }\n      runCount\n      lastRunAt\n      nextRunAt\n    }\n  }\n": typeof types.GetRoutineByWorkstreamDocument,
    "\n  query GetRoutineRunHistory($routineId: ID!, $limit: Int) {\n    routineRunHistory(routineId: $routineId, limit: $limit) {\n      id\n      routineId\n      status\n      triggeredBy\n      startedAt\n      completedAt\n      summary\n      error\n      createdAt\n    }\n  }\n": typeof types.GetRoutineRunHistoryDocument,
    "\n  query GetRoutineLatestRun($routineId: ID!) {\n    routineLatestRun(routineId: $routineId) {\n      id\n      status\n      triggeredBy\n      startedAt\n      completedAt\n      summary\n      error\n    }\n  }\n": typeof types.GetRoutineLatestRunDocument,
    "\n  mutation CreateRoutine($input: CreateRoutineInput!) {\n    createRoutine(input: $input) {\n      routine {\n        id name description prompt workstreamId status\n        schedule { type expression timezone }\n        runCount createdAt\n      }\n    }\n  }\n": typeof types.CreateRoutineDocument,
    "\n  mutation UpdateRoutine($id: ID!, $input: UpdateRoutineInput!) {\n    updateRoutine(id: $id, input: $input) {\n      routine {\n        id name description prompt status\n        schedule { type expression timezone }\n        updatedAt\n      }\n    }\n  }\n": typeof types.UpdateRoutineDocument,
    "\n  mutation DeleteRoutine($id: ID!) {\n    deleteRoutine(id: $id) {\n      routine { id name }\n    }\n  }\n": typeof types.DeleteRoutineDocument,
    "\n  mutation PauseRoutine($id: ID!) {\n    pauseRoutine(id: $id) {\n      routine { id status updatedAt }\n    }\n  }\n": typeof types.PauseRoutineDocument,
    "\n  mutation ResumeRoutine($id: ID!) {\n    resumeRoutine(id: $id) {\n      routine { id status nextRunAt updatedAt }\n    }\n  }\n": typeof types.ResumeRoutineDocument,
    "\n  mutation RunRoutineNow($id: ID!) {\n    runRoutineNow(id: $id) {\n      routine {\n        id status runCount lastRunAt\n        latestRun { id status triggeredBy startedAt completedAt }\n      }\n    }\n  }\n": typeof types.RunRoutineNowDocument,
    "\n  mutation SendWorkstreamMessage($workstreamId: ID!, $text: String!, $imageAttachments: [ImageAttachmentInput!], $imageContentBlocks: [ImageContentBlockInput!]) {\n    sendWorkstreamMessage(workstreamId: $workstreamId, text: $text, imageAttachments: $imageAttachments, imageContentBlocks: $imageContentBlocks) {\n      workstream { id status messageCount lastActivityAt updatedAt }\n    }\n  }\n": typeof types.SendWorkstreamMessageDocument,
    "\n  mutation StopWorkstreamAgent($id: ID!) {\n    stopWorkstreamAgent(id: $id) {\n      workstream { id status updatedAt }\n    }\n  }\n": typeof types.StopWorkstreamAgentDocument,
    "\n  mutation RestartWorkstreamAgent($id: ID!) {\n    restartWorkstreamAgent(id: $id) {\n      workstream { id status updatedAt }\n    }\n  }\n": typeof types.RestartWorkstreamAgentDocument,
    "\n  mutation RespondWorkstreamPermission($workstreamId: ID!, $requestId: String!, $response: PermissionResponseInput!) {\n    respondWorkstreamPermission(workstreamId: $workstreamId, requestId: $requestId, response: $response) {\n      workstream { id status updatedAt }\n    }\n  }\n": typeof types.RespondWorkstreamPermissionDocument,
    "\n  mutation RevokePermissionRule($workstreamId: ID!, $toolName: String!, $scope: PermissionRuleScope!) {\n    revokePermissionRule(workstreamId: $workstreamId, toolName: $toolName, scope: $scope) {\n      workstream { id status updatedAt }\n    }\n  }\n": typeof types.RevokePermissionRuleDocument,
    "\n  mutation InterruptWorkstreamAgent($id: ID!) {\n    interruptWorkstreamAgent(id: $id) {\n      workstream { id status updatedAt }\n    }\n  }\n": typeof types.InterruptWorkstreamAgentDocument,
    "\n  mutation ClearWorkstreamConversation($id: ID!) {\n    clearWorkstreamConversation(id: $id) {\n      workstream { id status updatedAt }\n    }\n  }\n": typeof types.ClearWorkstreamConversationDocument,
    "\n  mutation CompactWorkstreamConversation($id: ID!, $instructions: String) {\n    compactWorkstreamConversation(id: $id, instructions: $instructions) {\n      workstream { id status updatedAt }\n    }\n  }\n": typeof types.CompactWorkstreamConversationDocument,
    "\n  mutation RewindWorkstreamConversation($id: ID!, $eventId: Int!, $role: String) {\n    rewindWorkstreamConversation(id: $id, eventId: $eventId, role: $role) {\n      workstream { id status updatedAt }\n    }\n  }\n": typeof types.RewindWorkstreamConversationDocument,
    "\n  mutation SetWorkstreamInFocus($id: ID) {\n    setWorkstreamInFocus(id: $id) {\n      workstream { id status updatedAt inFocus }\n    }\n  }\n": typeof types.SetWorkstreamInFocusDocument,
    "\n  mutation ReplayWorkstreamHistory($id: ID!) {\n    replayWorkstreamHistory(id: $id) {\n      workstream { id status updatedAt }\n      hasMore\n      oldestEventId\n    }\n  }\n": typeof types.ReplayWorkstreamHistoryDocument,
    "\n  mutation LoadMoreWorkstreamHistory($id: ID!, $beforeEventId: Int!, $limit: Int) {\n    loadMoreWorkstreamHistory(id: $id, beforeEventId: $beforeEventId, limit: $limit) {\n      workstream { id status updatedAt }\n      hasMore\n      oldestEventId\n    }\n  }\n": typeof types.LoadMoreWorkstreamHistoryDocument,
    "\n  query IsWorkstreamAgentRunning($id: ID!) {\n    isWorkstreamAgentRunning(id: $id)\n  }\n": typeof types.IsWorkstreamAgentRunningDocument,
    "\n  query GetUserMessageHistory($workstreamId: ID!, $limit: Int, $before: Int) {\n    userMessageHistory(workstreamId: $workstreamId, limit: $limit, before: $before) {\n      items {\n        eventId\n        messageId\n        text\n        timestamp\n      }\n      hasMore\n    }\n  }\n": typeof types.GetUserMessageHistoryDocument,
    "\n  query GetWorkstreamLinkedEntities($workstreamId: ID!) {\n    workstreamLinkedEntities(workstreamId: $workstreamId) {\n      workstreamId\n      entityUri\n      entityType\n      entityTitle\n      contextOverride\n      createdAt\n      isInherited\n    }\n  }\n": typeof types.GetWorkstreamLinkedEntitiesDocument,
    "\n  query GetWorkstreamDirectories($workstreamId: ID!) {\n    workstreamDirectories(workstreamId: $workstreamId) {\n      id\n      workstreamId\n      path\n      label\n      isInherited\n      createdAt\n    }\n  }\n": typeof types.GetWorkstreamDirectoriesDocument,
    "\n  mutation SwitchWorkstreamModel($id: ID!, $model: String!) {\n    switchWorkstreamModel(id: $id, model: $model) {\n      workstream { id model updatedAt }\n    }\n  }\n": typeof types.SwitchWorkstreamModelDocument,
    "\n  mutation LinkWorkstreamEntity($workstreamId: ID!, $entityUri: String!, $entityType: String!, $entityTitle: String) {\n    linkWorkstreamEntity(workstreamId: $workstreamId, entityUri: $entityUri, entityType: $entityType, entityTitle: $entityTitle) {\n      workstream { id updatedAt }\n    }\n  }\n": typeof types.LinkWorkstreamEntityDocument,
    "\n  mutation UnlinkWorkstreamEntity($workstreamId: ID!, $entityUri: String!) {\n    unlinkWorkstreamEntity(workstreamId: $workstreamId, entityUri: $entityUri) {\n      workstream { id updatedAt }\n    }\n  }\n": typeof types.UnlinkWorkstreamEntityDocument,
    "\n  mutation SetLinkedEntityContextOverride($workstreamId: ID!, $entityUri: String!, $contextOverride: String) {\n    setLinkedEntityContextOverride(workstreamId: $workstreamId, entityUri: $entityUri, contextOverride: $contextOverride) {\n      workstream { id updatedAt }\n    }\n  }\n": typeof types.SetLinkedEntityContextOverrideDocument,
    "\n  query GetWorkstreamReferences($workstreamId: ID!) {\n    workstreamReferences(workstreamId: $workstreamId) {\n      workstreamId\n      entityUri\n      entityType\n      entityTitle\n      externalUrl\n      firstReferencedAt\n    }\n  }\n": typeof types.GetWorkstreamReferencesDocument,
    "\n  mutation AddWorkstreamReference($workstreamId: ID!, $entityUri: String!, $entityType: String!, $entityTitle: String) {\n    addWorkstreamReference(workstreamId: $workstreamId, entityUri: $entityUri, entityType: $entityType, entityTitle: $entityTitle) {\n      workstream { id updatedAt }\n    }\n  }\n": typeof types.AddWorkstreamReferenceDocument,
    "\n  mutation RemoveWorkstreamReference($workstreamId: ID!, $entityUri: String!) {\n    removeWorkstreamReference(workstreamId: $workstreamId, entityUri: $entityUri) {\n      workstream { id updatedAt }\n    }\n  }\n": typeof types.RemoveWorkstreamReferenceDocument,
    "\n  mutation PromoteWorkstreamReference($workstreamId: ID!, $entityUri: String!, $entityType: String!, $entityTitle: String) {\n    promoteWorkstreamReference(workstreamId: $workstreamId, entityUri: $entityUri, entityType: $entityType, entityTitle: $entityTitle) {\n      workstream { id updatedAt }\n    }\n  }\n": typeof types.PromoteWorkstreamReferenceDocument,
    "\n  query GetWorkstreamsByEntity($entityUri: String!) {\n    workstreamsByEntity(entityUri: $entityUri) {\n      entityUri\n      entityType\n      entityTitle\n      workstreamId\n      groupId\n      createdAt\n      workstream {\n        id\n        title\n        status\n        groupId\n      }\n    }\n  }\n": typeof types.GetWorkstreamsByEntityDocument,
    "\n  query ResolveLinkedEntityContext($entityUri: String!) {\n    resolveLinkedEntityContext(entityUri: $entityUri)\n  }\n": typeof types.ResolveLinkedEntityContextDocument,
    "\n  query EntitySearch($query: String!, $types: [String!], $limit: Int) {\n    entitySearch(query: $query, types: $types, limit: $limit) {\n      id\n      type\n      uri\n      title\n    }\n  }\n": typeof types.EntitySearchDocument,
    "\n  mutation AddWorkstreamDirectory($workstreamId: ID!, $path: String!, $label: String) {\n    addWorkstreamDirectory(workstreamId: $workstreamId, path: $path, label: $label) {\n      workstream { id updatedAt }\n    }\n  }\n": typeof types.AddWorkstreamDirectoryDocument,
    "\n  mutation RemoveWorkstreamDirectory($workstreamId: ID!, $path: String!) {\n    removeWorkstreamDirectory(workstreamId: $workstreamId, path: $path) {\n      workstream { id updatedAt }\n    }\n  }\n": typeof types.RemoveWorkstreamDirectoryDocument,
    "\n  query GetProjectDirectories($projectId: ID!) {\n    projectDirectories(projectId: $projectId) {\n      id\n      projectId\n      path\n      label\n      createdAt\n    }\n  }\n": typeof types.GetProjectDirectoriesDocument,
    "\n  mutation AddProjectDirectory($projectId: ID!, $path: String!, $label: String) {\n    addProjectDirectory(projectId: $projectId, path: $path, label: $label) {\n      project { id updatedAt }\n      directory { id path label createdAt }\n    }\n  }\n": typeof types.AddProjectDirectoryDocument,
    "\n  mutation RemoveProjectDirectory($projectId: ID!, $path: String!) {\n    removeProjectDirectory(projectId: $projectId, path: $path) {\n      project { id updatedAt }\n      removed\n    }\n  }\n": typeof types.RemoveProjectDirectoryDocument,
    "\n  query GetBranchSelections($workstreamId: ID!) {\n    branchSelections(workstreamId: $workstreamId) {\n      id\n      workstreamId\n      directoryPath\n      branch\n      worktreePath\n      baseBranch\n      createdAt\n      updatedAt\n    }\n  }\n": typeof types.GetBranchSelectionsDocument,
    "\n  query GetDirectoriesWithBranchInfo($workstreamId: ID!) {\n    directoriesWithBranchInfo(workstreamId: $workstreamId) {\n      path\n      effectivePath\n      label\n      branch\n      baseBranch\n      worktreePath\n      isInherited\n    }\n  }\n": typeof types.GetDirectoriesWithBranchInfoDocument,
    "\n  mutation SetBranchSelection(\n    $workstreamId: ID!\n    $directoryPath: String!\n    $branch: String!\n    $worktreePath: String\n    $baseBranch: String\n    $createWorktree: Boolean\n  ) {\n    setBranchSelection(\n      workstreamId: $workstreamId\n      directoryPath: $directoryPath\n      branch: $branch\n      worktreePath: $worktreePath\n      baseBranch: $baseBranch\n      createWorktree: $createWorktree\n    ) {\n      branchSelection {\n        id\n        directoryPath\n        branch\n        worktreePath\n        baseBranch\n        updatedAt\n      }\n      worktreeError\n    }\n  }\n": typeof types.SetBranchSelectionDocument,
    "\n  mutation RemoveBranchSelection($workstreamId: ID!, $directoryPath: String!) {\n    removeBranchSelection(workstreamId: $workstreamId, directoryPath: $directoryPath) {\n      removed\n    }\n  }\n": typeof types.RemoveBranchSelectionDocument,
    "\n  query GetGroupDirectoriesWithBranches($groupId: ID!) {\n    workstreamGroup(id: $groupId) {\n      id\n      autoCreateWorktrees\n      directories {\n        id\n        path\n        label\n      }\n      branchSelections {\n        id\n        directoryPath\n        branch\n        baseBranch\n      }\n    }\n  }\n": typeof types.GetGroupDirectoriesWithBranchesDocument,
    "\n  mutation AddGroupDirectory($groupId: ID!, $path: String!, $label: String) {\n    addGroupDirectory(groupId: $groupId, path: $path, label: $label) {\n      group { id }\n    }\n  }\n": typeof types.AddGroupDirectoryDocument,
    "\n  mutation RemoveGroupDirectory($groupId: ID!, $path: String!) {\n    removeGroupDirectory(groupId: $groupId, path: $path) {\n      group { id }\n    }\n  }\n": typeof types.RemoveGroupDirectoryDocument,
    "\n  mutation SetGroupBranchSelection($groupId: ID!, $directoryPath: String!, $branch: String!, $baseBranch: String) {\n    setGroupBranchSelection(groupId: $groupId, directoryPath: $directoryPath, branch: $branch, baseBranch: $baseBranch) {\n      group { id }\n    }\n  }\n": typeof types.SetGroupBranchSelectionDocument,
    "\n  mutation RemoveGroupBranchSelection($groupId: ID!, $directoryPath: String!) {\n    removeGroupBranchSelection(groupId: $groupId, directoryPath: $directoryPath) {\n      group { id }\n    }\n  }\n": typeof types.RemoveGroupBranchSelectionDocument,
    "\n  mutation UpdateGroupAutoCreateWorktrees($id: ID!, $autoCreateWorktrees: Boolean!) {\n    updateWorkstreamGroup(id: $id, input: { autoCreateWorktrees: $autoCreateWorktrees }) {\n      group { id autoCreateWorktrees }\n    }\n  }\n": typeof types.UpdateGroupAutoCreateWorktreesDocument,
    "\n  mutation ArchiveWorkstreamGroup($id: ID!) {\n    archiveWorkstreamGroup(id: $id) {\n      group { id }\n    }\n  }\n": typeof types.ArchiveWorkstreamGroupDocument,
    "\n  query GetWorkstreamGroupsByProject($projectId: ID!) {\n    workstreamGroupsByProject(projectId: $projectId) {\n      id\n      name\n      emoji\n      isPinned\n      autoCreateWorktrees\n    }\n  }\n": typeof types.GetWorkstreamGroupsByProjectDocument,
    "\n  mutation CreateWorkstreamGroup($input: CreateWorkstreamGroupInput!) {\n    createWorkstreamGroup(input: $input) {\n      group { id name emoji isPinned }\n    }\n  }\n": typeof types.CreateWorkstreamGroupDocument,
    "\n  mutation UpdateWorkstreamGroup($id: ID!, $input: UpdateWorkstreamGroupInput!) {\n    updateWorkstreamGroup(id: $id, input: $input) {\n      group { id name emoji isPinned }\n    }\n  }\n": typeof types.UpdateWorkstreamGroupDocument,
    "\n  mutation PinWorkstreamGroup($id: ID!) {\n    pinWorkstreamGroup(id: $id) {\n      group { id isPinned }\n    }\n  }\n": typeof types.PinWorkstreamGroupDocument,
    "\n  mutation UnpinWorkstreamGroup($id: ID!) {\n    unpinWorkstreamGroup(id: $id) {\n      group { id isPinned }\n    }\n  }\n": typeof types.UnpinWorkstreamGroupDocument,
    "\n  mutation DeleteWorkstreamGroup($id: ID!) {\n    deleteWorkstreamGroup(id: $id) {\n      group { id }\n    }\n  }\n": typeof types.DeleteWorkstreamGroupDocument,
    "\n  mutation AddWorkstreamToGroup($workstreamId: ID!, $groupId: ID!) {\n    addWorkstreamToGroup(workstreamId: $workstreamId, groupId: $groupId) {\n      workstream { id groupId }\n    }\n  }\n": typeof types.AddWorkstreamToGroupDocument,
    "\n  mutation RemoveWorkstreamFromGroup($workstreamId: ID!) {\n    removeWorkstreamFromGroup(workstreamId: $workstreamId) {\n      workstream { id groupId }\n    }\n  }\n": typeof types.RemoveWorkstreamFromGroupDocument,
    "\n  mutation LinkGroupEntity($groupId: ID!, $entityUri: String!, $entityType: String!, $entityTitle: String) {\n    linkGroupEntity(groupId: $groupId, entityUri: $entityUri, entityType: $entityType, entityTitle: $entityTitle) {\n      group { id }\n    }\n  }\n": typeof types.LinkGroupEntityDocument,
    "\n  mutation UnlinkGroupEntity($groupId: ID!, $entityUri: String!) {\n    unlinkGroupEntity(groupId: $groupId, entityUri: $entityUri) {\n      group { id }\n    }\n  }\n": typeof types.UnlinkGroupEntityDocument,
    "\n  query GetGroupLinkedEntities($groupId: ID!) {\n    groupLinkedEntities(groupId: $groupId) {\n      groupId\n      entityUri\n      entityType\n      entityTitle\n      contextOverride\n      createdAt\n    }\n  }\n": typeof types.GetGroupLinkedEntitiesDocument,
    "\n  query IsGitRepo($path: String!) {\n    isGitRepo(path: $path)\n  }\n": typeof types.IsGitRepoDocument,
    "\n  query GetGitBranches($path: String!) {\n    gitBranches(path: $path) {\n      name\n      isCurrent\n      isRemote\n      hasWorktree\n      worktreePath\n    }\n  }\n": typeof types.GetGitBranchesDocument,
    "\n  query GetGitCurrentBranch($path: String!) {\n    gitCurrentBranch(path: $path)\n  }\n": typeof types.GetGitCurrentBranchDocument,
    "\n  query GetGitDefaultBranch($path: String!) {\n    gitDefaultBranch(path: $path)\n  }\n": typeof types.GetGitDefaultBranchDocument,
    "\n  query GetGitDiffSummary($path: String!, $base: String!) {\n    gitDiffSummary(path: $path, base: $base) {\n      additions\n      deletions\n      files {\n        path\n        status\n        oldPath\n        staged\n        additions\n        deletions\n      }\n    }\n  }\n": typeof types.GetGitDiffSummaryDocument,
    "\n  query GetGitWorkingTreeSummary($path: String!) {\n    gitWorkingTreeSummary(path: $path) {\n      additions\n      deletions\n      files {\n        path\n        status\n        oldPath\n        staged\n        additions\n        deletions\n      }\n    }\n  }\n": typeof types.GetGitWorkingTreeSummaryDocument,
    "\n  query GetGitCommitLog($path: String!, $base: String!) {\n    gitCommitLog(path: $path, base: $base) {\n      hash\n      shortHash\n      message\n      author\n      date\n    }\n  }\n": typeof types.GetGitCommitLogDocument,
    "\n  query GetGitCommitDiff($path: String!, $hash: String!) {\n    gitCommitDiff(path: $path, hash: $hash)\n  }\n": typeof types.GetGitCommitDiffDocument,
    "\n  query GetGitBranchDiff($path: String!, $base: String!) {\n    gitBranchDiff(path: $path, base: $base)\n  }\n": typeof types.GetGitBranchDiffDocument,
    "\n  query GetGitWorkingTreeDiff($path: String!) {\n    gitWorkingTreeDiff(path: $path)\n  }\n": typeof types.GetGitWorkingTreeDiffDocument,
    "\n  query GetGitStatusFiles($path: String!) {\n    gitStatusFiles(path: $path) {\n      path\n      status\n      oldPath\n      staged\n      additions\n      deletions\n    }\n  }\n": typeof types.GetGitStatusFilesDocument,
    "\n  query GetGitFileDiff($path: String!, $filePath: String!, $base: String) {\n    gitFileDiff(path: $path, filePath: $filePath, base: $base)\n  }\n": typeof types.GetGitFileDiffDocument,
    "\n  query GetGitFileAtRef($path: String!, $filePath: String!, $ref: String) {\n    gitFileAtRef(path: $path, filePath: $filePath, ref: $ref)\n  }\n": typeof types.GetGitFileAtRefDocument,
    "\n  query GetSettings {\n    settings {\n      appearance { theme fontSize compactMode zoomLevel }\n      ai { defaultModel cliPath cliSetupComplete autoCompactPercent }\n      advanced { developerMode focusMonitorEnabled focusMonitorIntervalMs }\n      permissions { activePreset rules { tool behavior entityType } }\n      notifications { mutedSources mutedTypes }\n    }\n  }\n": typeof types.GetSettingsDocument,
    "\n  mutation UpdateAppearanceSettings($input: UpdateAppearanceSettingsInput!) {\n    updateAppearanceSettings(input: $input) {\n      appearance { theme fontSize compactMode zoomLevel }\n      ai { defaultModel cliPath cliSetupComplete autoCompactPercent }\n      advanced { developerMode focusMonitorEnabled focusMonitorIntervalMs }\n      permissions { activePreset rules { tool behavior entityType } }\n      notifications { mutedSources mutedTypes }\n    }\n  }\n": typeof types.UpdateAppearanceSettingsDocument,
    "\n  mutation UpdateAiSettings($input: UpdateAiSettingsInput!) {\n    updateAiSettings(input: $input) {\n      appearance { theme fontSize compactMode zoomLevel }\n      ai { defaultModel cliPath cliSetupComplete autoCompactPercent }\n      advanced { developerMode focusMonitorEnabled focusMonitorIntervalMs }\n      permissions { activePreset rules { tool behavior entityType } }\n      notifications { mutedSources mutedTypes }\n    }\n  }\n": typeof types.UpdateAiSettingsDocument,
    "\n  mutation UpdateAdvancedSettings($input: UpdateAdvancedSettingsInput!) {\n    updateAdvancedSettings(input: $input) {\n      appearance { theme fontSize compactMode zoomLevel }\n      ai { defaultModel cliPath cliSetupComplete autoCompactPercent }\n      advanced { developerMode focusMonitorEnabled focusMonitorIntervalMs }\n      permissions { activePreset rules { tool behavior entityType } }\n      notifications { mutedSources mutedTypes }\n    }\n  }\n": typeof types.UpdateAdvancedSettingsDocument,
    "\n  mutation UpdateSettingsRaw($json: String!) {\n    updateSettingsRaw(json: $json) {\n      appearance { theme fontSize compactMode zoomLevel }\n      ai { defaultModel cliPath cliSetupComplete autoCompactPercent }\n      advanced { developerMode focusMonitorEnabled focusMonitorIntervalMs }\n      permissions { activePreset rules { tool behavior entityType } }\n      notifications { mutedSources mutedTypes }\n    }\n  }\n": typeof types.UpdateSettingsRawDocument,
    "\n  query GetNotificationSources {\n    notificationSources {\n      source\n      muted\n      types {\n        id\n        source\n        label\n        description\n        defaultEnabled\n        muted\n      }\n    }\n  }\n": typeof types.GetNotificationSourcesDocument,
    "\n  mutation SetNotificationSourceMuted($source: String!, $muted: Boolean!) {\n    setNotificationSourceMuted(source: $source, muted: $muted) {\n      notifications { mutedSources mutedTypes }\n    }\n  }\n": typeof types.SetNotificationSourceMutedDocument,
    "\n  mutation SetNotificationTypeMuted($typeId: String!, $muted: Boolean!) {\n    setNotificationTypeMuted(typeId: $typeId, muted: $muted) {\n      notifications { mutedSources mutedTypes }\n    }\n  }\n": typeof types.SetNotificationTypeMutedDocument,
    "\n  mutation ResetNotificationMutes {\n    resetNotificationMutes {\n      notifications { mutedSources mutedTypes }\n    }\n  }\n": typeof types.ResetNotificationMutesDocument,
    "\n  query GetRegistries {\n    registries {\n      id\n      name\n      url\n      enabled\n      priority\n      source\n      createdAt\n      updatedAt\n    }\n  }\n": typeof types.GetRegistriesDocument,
    "\n  query GetRegistry($id: ID!) {\n    registry(id: $id) {\n      id\n      name\n      url\n      enabled\n      priority\n      source\n      createdAt\n      updatedAt\n    }\n  }\n": typeof types.GetRegistryDocument,
    "\n  query GetRegistryQuickActions {\n    registryQuickActions {\n      id\n      label\n      icon\n      description\n      author { name }\n      tags\n      registry\n      options { id label prompt }\n    }\n  }\n": typeof types.GetRegistryQuickActionsDocument,
    "\n  query GetRegistryQuickActionDefaults {\n    registryQuickActionDefaults\n  }\n": typeof types.GetRegistryQuickActionDefaultsDocument,
    "\n  query GetRegistryVerificationActions {\n    registryVerificationActions {\n      id\n      type\n      label\n      builtinId\n      prompt\n    }\n  }\n": typeof types.GetRegistryVerificationActionsDocument,
    "\n  query GetRegistryVerificationActionDefaults {\n    registryVerificationActionDefaults {\n      id\n      type\n      label\n      builtinId\n      prompt\n    }\n  }\n": typeof types.GetRegistryVerificationActionDefaultsDocument,
    "\n  mutation AddRegistry($input: AddRegistryInput!) {\n    addRegistry(input: $input) {\n      registry {\n        id name url enabled priority source createdAt updatedAt\n      }\n    }\n  }\n": typeof types.AddRegistryDocument,
    "\n  mutation RemoveRegistry($id: ID!) {\n    removeRegistry(id: $id) {\n      registry { id name }\n    }\n  }\n": typeof types.RemoveRegistryDocument,
    "\n  mutation UpdateRegistry($id: ID!, $input: UpdateRegistryInput!) {\n    updateRegistry(id: $id, input: $input) {\n      registry {\n        id name url enabled priority updatedAt\n      }\n    }\n  }\n": typeof types.UpdateRegistryDocument,
    "\n  mutation SyncRegistries {\n    syncRegistries {\n      synced\n    }\n  }\n": typeof types.SyncRegistriesDocument,
    "\n  query GetInstalledSkills {\n    installedSkills {\n      id name description version registryVersion\n      source sourceRef registry path\n      icon category tags author\n      enabled pinned installDate lastUsed useCount\n      hasUpdate\n    }\n  }\n": typeof types.GetInstalledSkillsDocument,
    "\n  query GetRegistrySkills {\n    registrySkills {\n      id name description version\n      source repo icon category tags\n      author { name }\n      registry\n    }\n  }\n": typeof types.GetRegistrySkillsDocument,
    "\n  mutation InstallSkill($skillId: String!, $destination: String) {\n    installSkill(skillId: $skillId, destination: $destination) {\n      skill {\n        id name description version registryVersion\n        source sourceRef registry path\n        icon category tags author\n        enabled pinned installDate lastUsed useCount\n        hasUpdate\n      }\n    }\n  }\n": typeof types.InstallSkillDocument,
    "\n  mutation UninstallSkill($skillId: String!) {\n    uninstallSkill(skillId: $skillId) {\n      success\n    }\n  }\n": typeof types.UninstallSkillDocument,
    "\n  mutation UpdateSkill($skillId: String!) {\n    updateSkill(skillId: $skillId) {\n      skill {\n        id name description version registryVersion\n        source sourceRef registry path\n        icon category tags author\n        enabled pinned installDate lastUsed useCount\n        hasUpdate\n      }\n    }\n  }\n": typeof types.UpdateSkillDocument,
    "\n  mutation ActivateSkill($skillId: String!) {\n    activateSkill(skillId: $skillId) {\n      body\n    }\n  }\n": typeof types.ActivateSkillDocument,
    "\n  mutation ToggleSkillEnabled($skillId: String!, $enabled: Boolean!) {\n    toggleSkillEnabled(skillId: $skillId, enabled: $enabled) {\n      skill {\n        id enabled\n      }\n    }\n  }\n": typeof types.ToggleSkillEnabledDocument,
    "\n  mutation ToggleSkillPinned($skillId: String!, $pinned: Boolean!) {\n    toggleSkillPinned(skillId: $skillId, pinned: $pinned) {\n      skill {\n        id pinned\n      }\n    }\n  }\n": typeof types.ToggleSkillPinnedDocument,
    "\n  mutation SyncLocalSkills {\n    syncLocalSkills\n  }\n": typeof types.SyncLocalSkillsDocument,
    "\n  query GetInstalledPlugins {\n    installedPlugins {\n      id name description version registryVersion\n      source sourceRef registry path\n      icon category tags author\n      enabled installDate\n      hasUpdate\n    }\n  }\n": typeof types.GetInstalledPluginsDocument,
    "\n  query GetRegistryPlugins {\n    registryPlugins {\n      id name description version\n      source repo icon category tags\n      author { name }\n      registry\n      canvases { navSidebar drawer menuBar feed }\n    }\n  }\n": typeof types.GetRegistryPluginsDocument,
    "\n  mutation InstallPlugin($pluginId: String!) {\n    installPlugin(pluginId: $pluginId) {\n      plugin {\n        id name description version registryVersion\n        source sourceRef registry path\n        icon category tags author\n        enabled installDate\n        hasUpdate\n      }\n    }\n  }\n": typeof types.InstallPluginDocument,
    "\n  mutation UninstallPlugin($pluginId: String!) {\n    uninstallPlugin(pluginId: $pluginId) {\n      success\n    }\n  }\n": typeof types.UninstallPluginDocument,
    "\n  mutation UpdatePlugin($pluginId: String!) {\n    updatePlugin(pluginId: $pluginId) {\n      plugin {\n        id name description version registryVersion\n        source sourceRef registry path\n        icon category tags author\n        enabled installDate\n        hasUpdate\n      }\n    }\n  }\n": typeof types.UpdatePluginDocument,
    "\n  mutation TogglePluginEnabled($pluginId: String!, $enabled: Boolean!) {\n    togglePluginEnabled(pluginId: $pluginId, enabled: $enabled) {\n      plugin {\n        id enabled\n      }\n    }\n  }\n": typeof types.TogglePluginEnabledDocument,
    "\n  query GetCommands($categoryFilter: String) {\n    commands(categoryFilter: $categoryFilter) {\n      id\n      category\n      title\n      description\n      keywords\n      disabled\n      disabledReason\n      hasFlow\n      body\n    }\n  }\n": typeof types.GetCommandsDocument,
    "\n  mutation ExecuteCommand($commandId: String!, $args: JSON) {\n    executeCommand(commandId: $commandId, args: $args) {\n      success\n      error\n      action {\n        type\n        path\n        message\n        variant\n        text\n      }\n    }\n  }\n": typeof types.ExecuteCommandDocument,
    "\n  mutation RescanClaudeCommands {\n    rescanClaudeCommands\n  }\n": typeof types.RescanClaudeCommandsDocument,
    "\n  mutation UpdatePermissionsSettings($input: UpdatePermissionsSettingsInput!) {\n    updatePermissionsSettings(input: $input) {\n      appearance { theme fontSize compactMode zoomLevel }\n      ai { defaultModel cliPath cliSetupComplete autoCompactPercent }\n      advanced { developerMode focusMonitorEnabled focusMonitorIntervalMs }\n      permissions { activePreset rules { tool behavior entityType } }\n      notifications { mutedSources mutedTypes }\n    }\n  }\n": typeof types.UpdatePermissionsSettingsDocument,
    "\n  query GetPermissionPolicy($scopeType: PermissionScopeType!, $scopeId: String!) {\n    permissionPolicy(scopeType: $scopeType, scopeId: $scopeId) {\n      id\n      scopeType\n      scopeId\n      rules { tool behavior entityType }\n      templateId\n      createdAt\n      updatedAt\n    }\n  }\n": typeof types.GetPermissionPolicyDocument,
    "\n  mutation SetPermissionPolicy($scopeType: PermissionScopeType!, $scopeId: String!, $rules: [PermissionRuleConfigInput!]!) {\n    setPermissionPolicy(scopeType: $scopeType, scopeId: $scopeId, rules: $rules) {\n      id\n      scopeType\n      scopeId\n      rules { tool behavior entityType }\n      templateId\n    }\n  }\n": typeof types.SetPermissionPolicyDocument,
    "\n  mutation DeletePermissionPolicy($scopeType: PermissionScopeType!, $scopeId: String!) {\n    deletePermissionPolicy(scopeType: $scopeType, scopeId: $scopeId)\n  }\n": typeof types.DeletePermissionPolicyDocument,
    "\n  query GetResolvedPermissions($workstreamId: ID!) {\n    resolvedPermissions(workstreamId: $workstreamId) {\n      tool\n      behavior\n      entityType\n    }\n  }\n": typeof types.GetResolvedPermissionsDocument,
    "\n  query GetResolvedParentPermissions($scopeType: PermissionScopeType!, $scopeId: String!) {\n    resolvedParentPermissions(scopeType: $scopeType, scopeId: $scopeId) {\n      tool\n      behavior\n      entityType\n    }\n  }\n": typeof types.GetResolvedParentPermissionsDocument,
    "\n  query GetPermissionTemplates {\n    permissionTemplates {\n      id\n      name\n      description\n      rules { tool behavior entityType }\n      createdAt\n      updatedAt\n    }\n  }\n": typeof types.GetPermissionTemplatesDocument,
    "\n  query GetPermissionTemplate($id: ID!) {\n    permissionTemplate(id: $id) {\n      id\n      name\n      description\n      rules { tool behavior entityType }\n      createdAt\n      updatedAt\n    }\n  }\n": typeof types.GetPermissionTemplateDocument,
    "\n  mutation CreatePermissionTemplate($name: String!, $description: String, $rules: [PermissionRuleConfigInput!]!) {\n    createPermissionTemplate(name: $name, description: $description, rules: $rules) {\n      id\n      name\n      description\n      rules { tool behavior entityType }\n      createdAt\n      updatedAt\n    }\n  }\n": typeof types.CreatePermissionTemplateDocument,
    "\n  mutation UpdatePermissionTemplate($id: ID!, $name: String, $description: String, $rules: [PermissionRuleConfigInput!]) {\n    updatePermissionTemplate(id: $id, name: $name, description: $description, rules: $rules) {\n      id\n      name\n      description\n      rules { tool behavior entityType }\n      createdAt\n      updatedAt\n    }\n  }\n": typeof types.UpdatePermissionTemplateDocument,
    "\n  mutation DeletePermissionTemplate($id: ID!) {\n    deletePermissionTemplate(id: $id)\n  }\n": typeof types.DeletePermissionTemplateDocument,
    "\n  mutation ApplyPermissionTemplate($templateId: ID!, $scopeType: PermissionScopeType!, $scopeId: String!) {\n    applyPermissionTemplate(templateId: $templateId, scopeType: $scopeType, scopeId: $scopeId)\n  }\n": typeof types.ApplyPermissionTemplateDocument,
    "\n  query GetTagsByProject($projectId: ID!) {\n    tagsByProject(projectId: $projectId) {\n      name\n      instructions\n      color\n      maxDepth\n      spawnWorkstream\n      worktreeMode\n      dependsOn\n    }\n  }\n": typeof types.GetTagsByProjectDocument,
    "\n  query GetTagByName($projectId: ID!, $name: String!) {\n    tagByName(projectId: $projectId, name: $name) {\n      name\n      instructions\n      color\n      maxDepth\n      spawnWorkstream\n      worktreeMode\n      dependsOn\n    }\n  }\n": typeof types.GetTagByNameDocument,
    "\n  query GetWorkstreamTags($workstreamId: ID!) {\n    workstreamTags(workstreamId: $workstreamId) {\n      id\n      workstreamId\n      tagName\n      tagInstructions\n      tagColor\n      tagMaxDepth\n      tagSpawnWorkstream\n      tagWorktreeMode\n      tagDependsOn\n      status\n      appliedAt\n      startedAt\n      completedAt\n      error\n      appliedBy\n      depth\n      delegatedWorkstreamId\n    }\n  }\n": typeof types.GetWorkstreamTagsDocument,
    "\n  mutation CreateTag($input: CreateTagInput!) {\n    createTag(input: $input) {\n      tag {\n        name\n        instructions\n        color\n        maxDepth\n        spawnWorkstream\n        worktreeMode\n        dependsOn\n      }\n    }\n  }\n": typeof types.CreateTagDocument,
    "\n  mutation UpdateTag($projectId: ID!, $tagName: String!, $input: UpdateTagInput!) {\n    updateTag(projectId: $projectId, tagName: $tagName, input: $input) {\n      tag {\n        name\n        instructions\n        color\n        maxDepth\n        spawnWorkstream\n        worktreeMode\n        dependsOn\n      }\n    }\n  }\n": typeof types.UpdateTagDocument,
    "\n  mutation DeleteTag($projectId: ID!, $tagName: String!) {\n    deleteTag(projectId: $projectId, tagName: $tagName) {\n      tag {\n        name\n      }\n    }\n  }\n": typeof types.DeleteTagDocument,
    "\n  mutation ApplyTagToWorkstream($workstreamId: ID!, $tagName: String!) {\n    applyTagToWorkstream(workstreamId: $workstreamId, tagName: $tagName) {\n      workstreamTag {\n        id\n        workstreamId\n        tagName\n        tagColor\n        status\n        appliedAt\n        appliedBy\n        depth\n      }\n      pipelineRunId\n    }\n  }\n": typeof types.ApplyTagToWorkstreamDocument,
    "\n  mutation RemoveTagFromWorkstream($workstreamId: ID!, $tagName: String!) {\n    removeTagFromWorkstream(workstreamId: $workstreamId, tagName: $tagName) {\n      success\n    }\n  }\n": typeof types.RemoveTagFromWorkstreamDocument,
    "\n  query GetContentProfiles {\n    contentProfiles {\n      name\n      directory\n      isDefault\n      isActive\n      isFork\n      metadata {\n        displayName\n        description\n        author {\n          name\n          url\n        }\n        icon\n        tags\n        sourceUrl\n      }\n    }\n  }\n": typeof types.GetContentProfilesDocument,
    "\n  query GetActiveContentProfile {\n    activeContentProfile {\n      name\n      directory\n      isDefault\n      isActive\n      isFork\n      metadata {\n        displayName\n        description\n        icon\n        tags\n        sourceUrl\n      }\n    }\n  }\n": typeof types.GetActiveContentProfileDocument,
    "\n  mutation ForkContentProfile($gitUrl: String!, $name: String) {\n    forkContentProfile(gitUrl: $gitUrl, name: $name) {\n      name\n      directory\n      isDefault\n      isActive\n      isFork\n      metadata {\n        displayName\n        description\n        icon\n        sourceUrl\n      }\n    }\n  }\n": typeof types.ForkContentProfileDocument,
    "\n  mutation SwitchContentProfile($name: String!) {\n    switchContentProfile(name: $name)\n  }\n": typeof types.SwitchContentProfileDocument,
    "\n  mutation DeleteContentProfile($name: String!) {\n    deleteContentProfile(name: $name)\n  }\n": typeof types.DeleteContentProfileDocument,
    "\n  query GetTask($id: ID!) {\n    task(id: $id) {\n      id\n      projectId\n      identifier\n      title\n      description\n      status\n      priority\n      assigneeType\n      assigneeWorkstreamId\n      dueDate\n      parentId\n      links\n      createdAt\n      updatedAt\n      labels {\n        id\n        name\n        color\n      }\n      subtasks {\n        id\n        identifier\n        title\n        status\n        priority\n      }\n      parent {\n        id\n        identifier\n        title\n      }\n    }\n  }\n": typeof types.GetTaskDocument,
    "\n  query GetTasks($projectId: ID!, $status: TaskStatus, $priority: TaskPriority, $assigneeType: TaskAssigneeType, $labelId: String, $parentId: String, $query: String, $limit: Int) {\n    tasks(projectId: $projectId, status: $status, priority: $priority, assigneeType: $assigneeType, labelId: $labelId, parentId: $parentId, query: $query, limit: $limit) {\n      id\n      projectId\n      identifier\n      title\n      description\n      status\n      priority\n      assigneeType\n      assigneeWorkstreamId\n      dueDate\n      parentId\n      links\n      createdAt\n      updatedAt\n      labels {\n        id\n        name\n        color\n      }\n    }\n  }\n": typeof types.GetTasksDocument,
    "\n  query GetTaskLabels($projectId: ID!) {\n    taskLabels(projectId: $projectId) {\n      id\n      projectId\n      name\n      color\n      createdAt\n    }\n  }\n": typeof types.GetTaskLabelsDocument,
    "\n  mutation CreateTask($input: CreateTaskInput!) {\n    createTask(input: $input) {\n      task {\n        id\n        projectId\n        identifier\n        title\n        status\n        priority\n        createdAt\n      }\n    }\n  }\n": typeof types.CreateTaskDocument,
    "\n  mutation UpdateTask($id: ID!, $input: UpdateTaskInput!) {\n    updateTask(id: $id, input: $input) {\n      task {\n        id\n        projectId\n        identifier\n        title\n        description\n        status\n        priority\n        assigneeType\n        assigneeWorkstreamId\n        dueDate\n        parentId\n        links\n        createdAt\n        updatedAt\n        labels {\n          id\n          name\n          color\n        }\n      }\n    }\n  }\n": typeof types.UpdateTaskDocument,
    "\n  mutation DeleteTask($id: ID!) {\n    deleteTask(id: $id) {\n      success\n    }\n  }\n": typeof types.DeleteTaskDocument,
    "\n  mutation CreateTaskLabel($projectId: ID!, $name: String!, $color: String!) {\n    createTaskLabel(projectId: $projectId, name: $name, color: $color) {\n      label {\n        id\n        projectId\n        name\n        color\n        createdAt\n      }\n    }\n  }\n": typeof types.CreateTaskLabelDocument,
    "\n  mutation UpdateTaskLabel($id: ID!, $name: String, $color: String) {\n    updateTaskLabel(id: $id, name: $name, color: $color) {\n      label {\n        id\n        projectId\n        name\n        color\n        createdAt\n      }\n    }\n  }\n": typeof types.UpdateTaskLabelDocument,
    "\n  mutation DeleteTaskLabel($id: ID!) {\n    deleteTaskLabel(id: $id) {\n      success\n    }\n  }\n": typeof types.DeleteTaskLabelDocument,
    "\n  query GetInboxItems($includeArchived: Boolean, $includeRead: Boolean, $limit: Int, $offset: Int) {\n    inboxItems(includeArchived: $includeArchived, includeRead: $includeRead, limit: $limit, offset: $offset) {\n      id\n      title\n      description\n      icon\n      source\n      actions {\n        id\n        label\n        payload\n      }\n      entityUri\n      ctaLabel\n      read\n      archived\n      createdAt\n      updatedAt\n    }\n  }\n": typeof types.GetInboxItemsDocument,
    "\n  query GetInboxUnreadCount {\n    inboxUnreadCount\n  }\n": typeof types.GetInboxUnreadCountDocument,
    "\n  mutation PushInboxItem($input: PushInboxItemInput!) {\n    pushInboxItem(input: $input) {\n      inboxItem {\n        id\n        title\n        description\n        icon\n        source\n        actions {\n          id\n          label\n          payload\n        }\n        entityUri\n        ctaLabel\n        read\n        archived\n        createdAt\n        updatedAt\n      }\n    }\n  }\n": typeof types.PushInboxItemDocument,
    "\n  mutation MarkInboxItemRead($id: ID!) {\n    markInboxItemRead(id: $id) {\n      inboxItem {\n        id\n        read\n      }\n    }\n  }\n": typeof types.MarkInboxItemReadDocument,
    "\n  mutation MarkAllInboxItemsRead {\n    markAllInboxItemsRead {\n      count\n    }\n  }\n": typeof types.MarkAllInboxItemsReadDocument,
    "\n  mutation ArchiveInboxItem($id: ID!) {\n    archiveInboxItem(id: $id) {\n      inboxItem {\n        id\n        archived\n      }\n    }\n  }\n": typeof types.ArchiveInboxItemDocument,
    "\n  mutation DeleteInboxItem($id: ID!) {\n    deleteInboxItem(id: $id) {\n      success\n    }\n  }\n": typeof types.DeleteInboxItemDocument,
    "\n  mutation ExecuteInboxAction($actionId: String!, $payload: JSON) {\n    executeInboxAction(actionId: $actionId, payload: $payload) {\n      success\n    }\n  }\n": typeof types.ExecuteInboxActionDocument,
    "\n  query GetRegisteredEvents {\n    registeredEvents {\n      qualifiedName\n      localName\n      description\n      ownerPluginId\n      listenerCount\n      payloadSchema\n    }\n  }\n": typeof types.GetRegisteredEventsDocument,
    "\n  query GetEntityToolEntries {\n    entityToolEntries {\n      uri\n      addedAt\n    }\n  }\n": typeof types.GetEntityToolEntriesDocument,
    "\n  mutation AddEntityToolEntry($uri: String!) {\n    addEntityToolEntry(uri: $uri) {\n      entry {\n        uri\n        addedAt\n      }\n      alreadyExists\n    }\n  }\n": typeof types.AddEntityToolEntryDocument,
    "\n  mutation RemoveEntityToolEntry($uri: String!) {\n    removeEntityToolEntry(uri: $uri) {\n      success\n    }\n  }\n": typeof types.RemoveEntityToolEntryDocument,
};
const documents: Documents = {
    "\n  query GetProjects {\n    projects {\n      id\n      name\n      createdAt\n      updatedAt\n    }\n  }\n": types.GetProjectsDocument,
    "\n  query GetProject($id: ID!) {\n    project(id: $id) {\n      id\n      name\n      createdAt\n      updatedAt\n      workstreams {\n        id\n        title\n        status\n        isPinned\n        messageCount\n        lastActivityAt\n      }\n    }\n  }\n": types.GetProjectDocument,
    "\n  mutation CreateProject($input: CreateProjectInput!) {\n    createProject(input: $input) {\n      id\n      name\n      createdAt\n      updatedAt\n    }\n  }\n": types.CreateProjectDocument,
    "\n  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {\n    updateProject(id: $id, input: $input) {\n      id\n      name\n      updatedAt\n    }\n  }\n": types.UpdateProjectDocument,
    "\n  mutation DeleteProject($id: ID!) {\n    deleteProject(id: $id)\n  }\n": types.DeleteProjectDocument,
    "\n  query GetWorkstreamsByProject($projectId: ID!) {\n    workstreamsByProject(projectId: $projectId) {\n      id\n      title\n      status\n      model\n      isPinned\n      isRoutineWorkstream\n      groupId\n      messageCount\n      lastActivityAt\n      createdAt\n      updatedAt\n      inFocus\n    }\n  }\n": types.GetWorkstreamsByProjectDocument,
    "\n  query GetWorkstream($id: ID!) {\n    workstream(id: $id) {\n      id\n      title\n      status\n      model\n      isPinned\n      messageCount\n      lastActivityAt\n      createdAt\n      updatedAt\n      project {\n        id\n        name\n      }\n    }\n  }\n": types.GetWorkstreamDocument,
    "\n  query GetArchivedWorkstreams($projectId: ID!) {\n    archivedWorkstreams(projectId: $projectId) {\n      id\n      title\n      status\n      messageCount\n      archivedAt\n      updatedAt\n    }\n  }\n": types.GetArchivedWorkstreamsDocument,
    "\n  mutation CreateWorkstream($input: CreateWorkstreamInput!) {\n    createWorkstream(input: $input) {\n      workstream { id title status model isPinned messageCount createdAt }\n    }\n  }\n": types.CreateWorkstreamDocument,
    "\n  mutation ForkWorkstream($input: ForkWorkstreamInput!) {\n    forkWorkstream(input: $input) {\n      workstream { id title status model isPinned messageCount createdAt groupId }\n      worktrees { directoryPath branch worktreePath error }\n    }\n  }\n": types.ForkWorkstreamDocument,
    "\n  mutation UpdateWorkstream($id: ID!, $input: UpdateWorkstreamInput!) {\n    updateWorkstream(id: $id, input: $input) {\n      workstream { id title status model isPinned updatedAt }\n    }\n  }\n": types.UpdateWorkstreamDocument,
    "\n  mutation ArchiveWorkstream($id: ID!) {\n    archiveWorkstream(id: $id) {\n      workstream { id status archivedAt updatedAt }\n    }\n  }\n": types.ArchiveWorkstreamDocument,
    "\n  mutation UnarchiveWorkstream($id: ID!) {\n    unarchiveWorkstream(id: $id) {\n      workstream { id status archivedAt updatedAt }\n    }\n  }\n": types.UnarchiveWorkstreamDocument,
    "\n  mutation PinWorkstream($id: ID!) {\n    pinWorkstream(id: $id) {\n      workstream { id isPinned }\n    }\n  }\n": types.PinWorkstreamDocument,
    "\n  mutation UnpinWorkstream($id: ID!) {\n    unpinWorkstream(id: $id) {\n      workstream { id isPinned }\n    }\n  }\n": types.UnpinWorkstreamDocument,
    "\n  mutation DeleteWorkstream($id: ID!) {\n    deleteWorkstream(id: $id) {\n      workstream { id }\n    }\n  }\n": types.DeleteWorkstreamDocument,
    "\n  query GetEntity($uri: String!) {\n    entity(uri: $uri) {\n      id\n      type\n      uri\n      title\n      description\n      createdAt\n      updatedAt\n    }\n  }\n": types.GetEntityDocument,
    "\n  query GetEntities($type: String!, $query: String, $filters: JSON, $limit: Int) {\n    entities(type: $type, query: $query, filters: $filters, limit: $limit) {\n      id\n      type\n      uri\n      title\n      description\n      createdAt\n      updatedAt\n    }\n  }\n": types.GetEntitiesDocument,
    "\n  query SearchEntities($query: String!, $types: [String!], $limit: Int) {\n    entitySearch(query: $query, types: $types, limit: $limit) {\n      id\n      type\n      uri\n      title\n      description\n      createdAt\n      updatedAt\n    }\n  }\n": types.SearchEntitiesDocument,
    "\n  query GetEntityTypes {\n    entityTypes {\n      type\n      displayName\n      icon\n      source\n      uriExample\n      display\n    }\n  }\n": types.GetEntityTypesDocument,
    "\n  query GetEntityMutationCatalog {\n    entityMutationCatalog {\n      entityType\n      entityDisplayName\n      mutations {\n        name\n        description\n        entityType\n      }\n    }\n  }\n": types.GetEntityMutationCatalogDocument,
    "\n  query GetRoutines {\n    routines {\n      id\n      name\n      description\n      workstreamId\n      status\n      schedule { type expression timezone }\n      runCount\n      lastRunAt\n      nextRunAt\n      createdAt\n      updatedAt\n      latestRun { id status triggeredBy startedAt completedAt }\n    }\n  }\n": types.GetRoutinesDocument,
    "\n  query GetRoutinesByProject($projectId: ID!) {\n    routinesByProject(projectId: $projectId) {\n      id\n      name\n      description\n      workstreamId\n      status\n      schedule { type expression timezone }\n      runCount\n      lastRunAt\n      nextRunAt\n      createdAt\n      updatedAt\n      latestRun { id status triggeredBy startedAt completedAt }\n    }\n  }\n": types.GetRoutinesByProjectDocument,
    "\n  query GetRoutine($id: ID!) {\n    routine(id: $id) {\n      id\n      name\n      description\n      prompt\n      workstreamId\n      status\n      schedule { type expression timezone }\n      preferences\n      runCount\n      lastRunAt\n      nextRunAt\n      createdAt\n      updatedAt\n      workstream { id title status }\n      latestRun { id status triggeredBy startedAt completedAt summary error }\n    }\n  }\n": types.GetRoutineDocument,
    "\n  query GetRoutineByWorkstream($workstreamId: ID!) {\n    routineByWorkstreamId(workstreamId: $workstreamId) {\n      id\n      name\n      description\n      prompt\n      status\n      schedule { type expression timezone }\n      runCount\n      lastRunAt\n      nextRunAt\n    }\n  }\n": types.GetRoutineByWorkstreamDocument,
    "\n  query GetRoutineRunHistory($routineId: ID!, $limit: Int) {\n    routineRunHistory(routineId: $routineId, limit: $limit) {\n      id\n      routineId\n      status\n      triggeredBy\n      startedAt\n      completedAt\n      summary\n      error\n      createdAt\n    }\n  }\n": types.GetRoutineRunHistoryDocument,
    "\n  query GetRoutineLatestRun($routineId: ID!) {\n    routineLatestRun(routineId: $routineId) {\n      id\n      status\n      triggeredBy\n      startedAt\n      completedAt\n      summary\n      error\n    }\n  }\n": types.GetRoutineLatestRunDocument,
    "\n  mutation CreateRoutine($input: CreateRoutineInput!) {\n    createRoutine(input: $input) {\n      routine {\n        id name description prompt workstreamId status\n        schedule { type expression timezone }\n        runCount createdAt\n      }\n    }\n  }\n": types.CreateRoutineDocument,
    "\n  mutation UpdateRoutine($id: ID!, $input: UpdateRoutineInput!) {\n    updateRoutine(id: $id, input: $input) {\n      routine {\n        id name description prompt status\n        schedule { type expression timezone }\n        updatedAt\n      }\n    }\n  }\n": types.UpdateRoutineDocument,
    "\n  mutation DeleteRoutine($id: ID!) {\n    deleteRoutine(id: $id) {\n      routine { id name }\n    }\n  }\n": types.DeleteRoutineDocument,
    "\n  mutation PauseRoutine($id: ID!) {\n    pauseRoutine(id: $id) {\n      routine { id status updatedAt }\n    }\n  }\n": types.PauseRoutineDocument,
    "\n  mutation ResumeRoutine($id: ID!) {\n    resumeRoutine(id: $id) {\n      routine { id status nextRunAt updatedAt }\n    }\n  }\n": types.ResumeRoutineDocument,
    "\n  mutation RunRoutineNow($id: ID!) {\n    runRoutineNow(id: $id) {\n      routine {\n        id status runCount lastRunAt\n        latestRun { id status triggeredBy startedAt completedAt }\n      }\n    }\n  }\n": types.RunRoutineNowDocument,
    "\n  mutation SendWorkstreamMessage($workstreamId: ID!, $text: String!, $imageAttachments: [ImageAttachmentInput!], $imageContentBlocks: [ImageContentBlockInput!]) {\n    sendWorkstreamMessage(workstreamId: $workstreamId, text: $text, imageAttachments: $imageAttachments, imageContentBlocks: $imageContentBlocks) {\n      workstream { id status messageCount lastActivityAt updatedAt }\n    }\n  }\n": types.SendWorkstreamMessageDocument,
    "\n  mutation StopWorkstreamAgent($id: ID!) {\n    stopWorkstreamAgent(id: $id) {\n      workstream { id status updatedAt }\n    }\n  }\n": types.StopWorkstreamAgentDocument,
    "\n  mutation RestartWorkstreamAgent($id: ID!) {\n    restartWorkstreamAgent(id: $id) {\n      workstream { id status updatedAt }\n    }\n  }\n": types.RestartWorkstreamAgentDocument,
    "\n  mutation RespondWorkstreamPermission($workstreamId: ID!, $requestId: String!, $response: PermissionResponseInput!) {\n    respondWorkstreamPermission(workstreamId: $workstreamId, requestId: $requestId, response: $response) {\n      workstream { id status updatedAt }\n    }\n  }\n": types.RespondWorkstreamPermissionDocument,
    "\n  mutation RevokePermissionRule($workstreamId: ID!, $toolName: String!, $scope: PermissionRuleScope!) {\n    revokePermissionRule(workstreamId: $workstreamId, toolName: $toolName, scope: $scope) {\n      workstream { id status updatedAt }\n    }\n  }\n": types.RevokePermissionRuleDocument,
    "\n  mutation InterruptWorkstreamAgent($id: ID!) {\n    interruptWorkstreamAgent(id: $id) {\n      workstream { id status updatedAt }\n    }\n  }\n": types.InterruptWorkstreamAgentDocument,
    "\n  mutation ClearWorkstreamConversation($id: ID!) {\n    clearWorkstreamConversation(id: $id) {\n      workstream { id status updatedAt }\n    }\n  }\n": types.ClearWorkstreamConversationDocument,
    "\n  mutation CompactWorkstreamConversation($id: ID!, $instructions: String) {\n    compactWorkstreamConversation(id: $id, instructions: $instructions) {\n      workstream { id status updatedAt }\n    }\n  }\n": types.CompactWorkstreamConversationDocument,
    "\n  mutation RewindWorkstreamConversation($id: ID!, $eventId: Int!, $role: String) {\n    rewindWorkstreamConversation(id: $id, eventId: $eventId, role: $role) {\n      workstream { id status updatedAt }\n    }\n  }\n": types.RewindWorkstreamConversationDocument,
    "\n  mutation SetWorkstreamInFocus($id: ID) {\n    setWorkstreamInFocus(id: $id) {\n      workstream { id status updatedAt inFocus }\n    }\n  }\n": types.SetWorkstreamInFocusDocument,
    "\n  mutation ReplayWorkstreamHistory($id: ID!) {\n    replayWorkstreamHistory(id: $id) {\n      workstream { id status updatedAt }\n      hasMore\n      oldestEventId\n    }\n  }\n": types.ReplayWorkstreamHistoryDocument,
    "\n  mutation LoadMoreWorkstreamHistory($id: ID!, $beforeEventId: Int!, $limit: Int) {\n    loadMoreWorkstreamHistory(id: $id, beforeEventId: $beforeEventId, limit: $limit) {\n      workstream { id status updatedAt }\n      hasMore\n      oldestEventId\n    }\n  }\n": types.LoadMoreWorkstreamHistoryDocument,
    "\n  query IsWorkstreamAgentRunning($id: ID!) {\n    isWorkstreamAgentRunning(id: $id)\n  }\n": types.IsWorkstreamAgentRunningDocument,
    "\n  query GetUserMessageHistory($workstreamId: ID!, $limit: Int, $before: Int) {\n    userMessageHistory(workstreamId: $workstreamId, limit: $limit, before: $before) {\n      items {\n        eventId\n        messageId\n        text\n        timestamp\n      }\n      hasMore\n    }\n  }\n": types.GetUserMessageHistoryDocument,
    "\n  query GetWorkstreamLinkedEntities($workstreamId: ID!) {\n    workstreamLinkedEntities(workstreamId: $workstreamId) {\n      workstreamId\n      entityUri\n      entityType\n      entityTitle\n      contextOverride\n      createdAt\n      isInherited\n    }\n  }\n": types.GetWorkstreamLinkedEntitiesDocument,
    "\n  query GetWorkstreamDirectories($workstreamId: ID!) {\n    workstreamDirectories(workstreamId: $workstreamId) {\n      id\n      workstreamId\n      path\n      label\n      isInherited\n      createdAt\n    }\n  }\n": types.GetWorkstreamDirectoriesDocument,
    "\n  mutation SwitchWorkstreamModel($id: ID!, $model: String!) {\n    switchWorkstreamModel(id: $id, model: $model) {\n      workstream { id model updatedAt }\n    }\n  }\n": types.SwitchWorkstreamModelDocument,
    "\n  mutation LinkWorkstreamEntity($workstreamId: ID!, $entityUri: String!, $entityType: String!, $entityTitle: String) {\n    linkWorkstreamEntity(workstreamId: $workstreamId, entityUri: $entityUri, entityType: $entityType, entityTitle: $entityTitle) {\n      workstream { id updatedAt }\n    }\n  }\n": types.LinkWorkstreamEntityDocument,
    "\n  mutation UnlinkWorkstreamEntity($workstreamId: ID!, $entityUri: String!) {\n    unlinkWorkstreamEntity(workstreamId: $workstreamId, entityUri: $entityUri) {\n      workstream { id updatedAt }\n    }\n  }\n": types.UnlinkWorkstreamEntityDocument,
    "\n  mutation SetLinkedEntityContextOverride($workstreamId: ID!, $entityUri: String!, $contextOverride: String) {\n    setLinkedEntityContextOverride(workstreamId: $workstreamId, entityUri: $entityUri, contextOverride: $contextOverride) {\n      workstream { id updatedAt }\n    }\n  }\n": types.SetLinkedEntityContextOverrideDocument,
    "\n  query GetWorkstreamReferences($workstreamId: ID!) {\n    workstreamReferences(workstreamId: $workstreamId) {\n      workstreamId\n      entityUri\n      entityType\n      entityTitle\n      externalUrl\n      firstReferencedAt\n    }\n  }\n": types.GetWorkstreamReferencesDocument,
    "\n  mutation AddWorkstreamReference($workstreamId: ID!, $entityUri: String!, $entityType: String!, $entityTitle: String) {\n    addWorkstreamReference(workstreamId: $workstreamId, entityUri: $entityUri, entityType: $entityType, entityTitle: $entityTitle) {\n      workstream { id updatedAt }\n    }\n  }\n": types.AddWorkstreamReferenceDocument,
    "\n  mutation RemoveWorkstreamReference($workstreamId: ID!, $entityUri: String!) {\n    removeWorkstreamReference(workstreamId: $workstreamId, entityUri: $entityUri) {\n      workstream { id updatedAt }\n    }\n  }\n": types.RemoveWorkstreamReferenceDocument,
    "\n  mutation PromoteWorkstreamReference($workstreamId: ID!, $entityUri: String!, $entityType: String!, $entityTitle: String) {\n    promoteWorkstreamReference(workstreamId: $workstreamId, entityUri: $entityUri, entityType: $entityType, entityTitle: $entityTitle) {\n      workstream { id updatedAt }\n    }\n  }\n": types.PromoteWorkstreamReferenceDocument,
    "\n  query GetWorkstreamsByEntity($entityUri: String!) {\n    workstreamsByEntity(entityUri: $entityUri) {\n      entityUri\n      entityType\n      entityTitle\n      workstreamId\n      groupId\n      createdAt\n      workstream {\n        id\n        title\n        status\n        groupId\n      }\n    }\n  }\n": types.GetWorkstreamsByEntityDocument,
    "\n  query ResolveLinkedEntityContext($entityUri: String!) {\n    resolveLinkedEntityContext(entityUri: $entityUri)\n  }\n": types.ResolveLinkedEntityContextDocument,
    "\n  query EntitySearch($query: String!, $types: [String!], $limit: Int) {\n    entitySearch(query: $query, types: $types, limit: $limit) {\n      id\n      type\n      uri\n      title\n    }\n  }\n": types.EntitySearchDocument,
    "\n  mutation AddWorkstreamDirectory($workstreamId: ID!, $path: String!, $label: String) {\n    addWorkstreamDirectory(workstreamId: $workstreamId, path: $path, label: $label) {\n      workstream { id updatedAt }\n    }\n  }\n": types.AddWorkstreamDirectoryDocument,
    "\n  mutation RemoveWorkstreamDirectory($workstreamId: ID!, $path: String!) {\n    removeWorkstreamDirectory(workstreamId: $workstreamId, path: $path) {\n      workstream { id updatedAt }\n    }\n  }\n": types.RemoveWorkstreamDirectoryDocument,
    "\n  query GetProjectDirectories($projectId: ID!) {\n    projectDirectories(projectId: $projectId) {\n      id\n      projectId\n      path\n      label\n      createdAt\n    }\n  }\n": types.GetProjectDirectoriesDocument,
    "\n  mutation AddProjectDirectory($projectId: ID!, $path: String!, $label: String) {\n    addProjectDirectory(projectId: $projectId, path: $path, label: $label) {\n      project { id updatedAt }\n      directory { id path label createdAt }\n    }\n  }\n": types.AddProjectDirectoryDocument,
    "\n  mutation RemoveProjectDirectory($projectId: ID!, $path: String!) {\n    removeProjectDirectory(projectId: $projectId, path: $path) {\n      project { id updatedAt }\n      removed\n    }\n  }\n": types.RemoveProjectDirectoryDocument,
    "\n  query GetBranchSelections($workstreamId: ID!) {\n    branchSelections(workstreamId: $workstreamId) {\n      id\n      workstreamId\n      directoryPath\n      branch\n      worktreePath\n      baseBranch\n      createdAt\n      updatedAt\n    }\n  }\n": types.GetBranchSelectionsDocument,
    "\n  query GetDirectoriesWithBranchInfo($workstreamId: ID!) {\n    directoriesWithBranchInfo(workstreamId: $workstreamId) {\n      path\n      effectivePath\n      label\n      branch\n      baseBranch\n      worktreePath\n      isInherited\n    }\n  }\n": types.GetDirectoriesWithBranchInfoDocument,
    "\n  mutation SetBranchSelection(\n    $workstreamId: ID!\n    $directoryPath: String!\n    $branch: String!\n    $worktreePath: String\n    $baseBranch: String\n    $createWorktree: Boolean\n  ) {\n    setBranchSelection(\n      workstreamId: $workstreamId\n      directoryPath: $directoryPath\n      branch: $branch\n      worktreePath: $worktreePath\n      baseBranch: $baseBranch\n      createWorktree: $createWorktree\n    ) {\n      branchSelection {\n        id\n        directoryPath\n        branch\n        worktreePath\n        baseBranch\n        updatedAt\n      }\n      worktreeError\n    }\n  }\n": types.SetBranchSelectionDocument,
    "\n  mutation RemoveBranchSelection($workstreamId: ID!, $directoryPath: String!) {\n    removeBranchSelection(workstreamId: $workstreamId, directoryPath: $directoryPath) {\n      removed\n    }\n  }\n": types.RemoveBranchSelectionDocument,
    "\n  query GetGroupDirectoriesWithBranches($groupId: ID!) {\n    workstreamGroup(id: $groupId) {\n      id\n      autoCreateWorktrees\n      directories {\n        id\n        path\n        label\n      }\n      branchSelections {\n        id\n        directoryPath\n        branch\n        baseBranch\n      }\n    }\n  }\n": types.GetGroupDirectoriesWithBranchesDocument,
    "\n  mutation AddGroupDirectory($groupId: ID!, $path: String!, $label: String) {\n    addGroupDirectory(groupId: $groupId, path: $path, label: $label) {\n      group { id }\n    }\n  }\n": types.AddGroupDirectoryDocument,
    "\n  mutation RemoveGroupDirectory($groupId: ID!, $path: String!) {\n    removeGroupDirectory(groupId: $groupId, path: $path) {\n      group { id }\n    }\n  }\n": types.RemoveGroupDirectoryDocument,
    "\n  mutation SetGroupBranchSelection($groupId: ID!, $directoryPath: String!, $branch: String!, $baseBranch: String) {\n    setGroupBranchSelection(groupId: $groupId, directoryPath: $directoryPath, branch: $branch, baseBranch: $baseBranch) {\n      group { id }\n    }\n  }\n": types.SetGroupBranchSelectionDocument,
    "\n  mutation RemoveGroupBranchSelection($groupId: ID!, $directoryPath: String!) {\n    removeGroupBranchSelection(groupId: $groupId, directoryPath: $directoryPath) {\n      group { id }\n    }\n  }\n": types.RemoveGroupBranchSelectionDocument,
    "\n  mutation UpdateGroupAutoCreateWorktrees($id: ID!, $autoCreateWorktrees: Boolean!) {\n    updateWorkstreamGroup(id: $id, input: { autoCreateWorktrees: $autoCreateWorktrees }) {\n      group { id autoCreateWorktrees }\n    }\n  }\n": types.UpdateGroupAutoCreateWorktreesDocument,
    "\n  mutation ArchiveWorkstreamGroup($id: ID!) {\n    archiveWorkstreamGroup(id: $id) {\n      group { id }\n    }\n  }\n": types.ArchiveWorkstreamGroupDocument,
    "\n  query GetWorkstreamGroupsByProject($projectId: ID!) {\n    workstreamGroupsByProject(projectId: $projectId) {\n      id\n      name\n      emoji\n      isPinned\n      autoCreateWorktrees\n    }\n  }\n": types.GetWorkstreamGroupsByProjectDocument,
    "\n  mutation CreateWorkstreamGroup($input: CreateWorkstreamGroupInput!) {\n    createWorkstreamGroup(input: $input) {\n      group { id name emoji isPinned }\n    }\n  }\n": types.CreateWorkstreamGroupDocument,
    "\n  mutation UpdateWorkstreamGroup($id: ID!, $input: UpdateWorkstreamGroupInput!) {\n    updateWorkstreamGroup(id: $id, input: $input) {\n      group { id name emoji isPinned }\n    }\n  }\n": types.UpdateWorkstreamGroupDocument,
    "\n  mutation PinWorkstreamGroup($id: ID!) {\n    pinWorkstreamGroup(id: $id) {\n      group { id isPinned }\n    }\n  }\n": types.PinWorkstreamGroupDocument,
    "\n  mutation UnpinWorkstreamGroup($id: ID!) {\n    unpinWorkstreamGroup(id: $id) {\n      group { id isPinned }\n    }\n  }\n": types.UnpinWorkstreamGroupDocument,
    "\n  mutation DeleteWorkstreamGroup($id: ID!) {\n    deleteWorkstreamGroup(id: $id) {\n      group { id }\n    }\n  }\n": types.DeleteWorkstreamGroupDocument,
    "\n  mutation AddWorkstreamToGroup($workstreamId: ID!, $groupId: ID!) {\n    addWorkstreamToGroup(workstreamId: $workstreamId, groupId: $groupId) {\n      workstream { id groupId }\n    }\n  }\n": types.AddWorkstreamToGroupDocument,
    "\n  mutation RemoveWorkstreamFromGroup($workstreamId: ID!) {\n    removeWorkstreamFromGroup(workstreamId: $workstreamId) {\n      workstream { id groupId }\n    }\n  }\n": types.RemoveWorkstreamFromGroupDocument,
    "\n  mutation LinkGroupEntity($groupId: ID!, $entityUri: String!, $entityType: String!, $entityTitle: String) {\n    linkGroupEntity(groupId: $groupId, entityUri: $entityUri, entityType: $entityType, entityTitle: $entityTitle) {\n      group { id }\n    }\n  }\n": types.LinkGroupEntityDocument,
    "\n  mutation UnlinkGroupEntity($groupId: ID!, $entityUri: String!) {\n    unlinkGroupEntity(groupId: $groupId, entityUri: $entityUri) {\n      group { id }\n    }\n  }\n": types.UnlinkGroupEntityDocument,
    "\n  query GetGroupLinkedEntities($groupId: ID!) {\n    groupLinkedEntities(groupId: $groupId) {\n      groupId\n      entityUri\n      entityType\n      entityTitle\n      contextOverride\n      createdAt\n    }\n  }\n": types.GetGroupLinkedEntitiesDocument,
    "\n  query IsGitRepo($path: String!) {\n    isGitRepo(path: $path)\n  }\n": types.IsGitRepoDocument,
    "\n  query GetGitBranches($path: String!) {\n    gitBranches(path: $path) {\n      name\n      isCurrent\n      isRemote\n      hasWorktree\n      worktreePath\n    }\n  }\n": types.GetGitBranchesDocument,
    "\n  query GetGitCurrentBranch($path: String!) {\n    gitCurrentBranch(path: $path)\n  }\n": types.GetGitCurrentBranchDocument,
    "\n  query GetGitDefaultBranch($path: String!) {\n    gitDefaultBranch(path: $path)\n  }\n": types.GetGitDefaultBranchDocument,
    "\n  query GetGitDiffSummary($path: String!, $base: String!) {\n    gitDiffSummary(path: $path, base: $base) {\n      additions\n      deletions\n      files {\n        path\n        status\n        oldPath\n        staged\n        additions\n        deletions\n      }\n    }\n  }\n": types.GetGitDiffSummaryDocument,
    "\n  query GetGitWorkingTreeSummary($path: String!) {\n    gitWorkingTreeSummary(path: $path) {\n      additions\n      deletions\n      files {\n        path\n        status\n        oldPath\n        staged\n        additions\n        deletions\n      }\n    }\n  }\n": types.GetGitWorkingTreeSummaryDocument,
    "\n  query GetGitCommitLog($path: String!, $base: String!) {\n    gitCommitLog(path: $path, base: $base) {\n      hash\n      shortHash\n      message\n      author\n      date\n    }\n  }\n": types.GetGitCommitLogDocument,
    "\n  query GetGitCommitDiff($path: String!, $hash: String!) {\n    gitCommitDiff(path: $path, hash: $hash)\n  }\n": types.GetGitCommitDiffDocument,
    "\n  query GetGitBranchDiff($path: String!, $base: String!) {\n    gitBranchDiff(path: $path, base: $base)\n  }\n": types.GetGitBranchDiffDocument,
    "\n  query GetGitWorkingTreeDiff($path: String!) {\n    gitWorkingTreeDiff(path: $path)\n  }\n": types.GetGitWorkingTreeDiffDocument,
    "\n  query GetGitStatusFiles($path: String!) {\n    gitStatusFiles(path: $path) {\n      path\n      status\n      oldPath\n      staged\n      additions\n      deletions\n    }\n  }\n": types.GetGitStatusFilesDocument,
    "\n  query GetGitFileDiff($path: String!, $filePath: String!, $base: String) {\n    gitFileDiff(path: $path, filePath: $filePath, base: $base)\n  }\n": types.GetGitFileDiffDocument,
    "\n  query GetGitFileAtRef($path: String!, $filePath: String!, $ref: String) {\n    gitFileAtRef(path: $path, filePath: $filePath, ref: $ref)\n  }\n": types.GetGitFileAtRefDocument,
    "\n  query GetSettings {\n    settings {\n      appearance { theme fontSize compactMode zoomLevel }\n      ai { defaultModel cliPath cliSetupComplete autoCompactPercent }\n      advanced { developerMode focusMonitorEnabled focusMonitorIntervalMs }\n      permissions { activePreset rules { tool behavior entityType } }\n      notifications { mutedSources mutedTypes }\n    }\n  }\n": types.GetSettingsDocument,
    "\n  mutation UpdateAppearanceSettings($input: UpdateAppearanceSettingsInput!) {\n    updateAppearanceSettings(input: $input) {\n      appearance { theme fontSize compactMode zoomLevel }\n      ai { defaultModel cliPath cliSetupComplete autoCompactPercent }\n      advanced { developerMode focusMonitorEnabled focusMonitorIntervalMs }\n      permissions { activePreset rules { tool behavior entityType } }\n      notifications { mutedSources mutedTypes }\n    }\n  }\n": types.UpdateAppearanceSettingsDocument,
    "\n  mutation UpdateAiSettings($input: UpdateAiSettingsInput!) {\n    updateAiSettings(input: $input) {\n      appearance { theme fontSize compactMode zoomLevel }\n      ai { defaultModel cliPath cliSetupComplete autoCompactPercent }\n      advanced { developerMode focusMonitorEnabled focusMonitorIntervalMs }\n      permissions { activePreset rules { tool behavior entityType } }\n      notifications { mutedSources mutedTypes }\n    }\n  }\n": types.UpdateAiSettingsDocument,
    "\n  mutation UpdateAdvancedSettings($input: UpdateAdvancedSettingsInput!) {\n    updateAdvancedSettings(input: $input) {\n      appearance { theme fontSize compactMode zoomLevel }\n      ai { defaultModel cliPath cliSetupComplete autoCompactPercent }\n      advanced { developerMode focusMonitorEnabled focusMonitorIntervalMs }\n      permissions { activePreset rules { tool behavior entityType } }\n      notifications { mutedSources mutedTypes }\n    }\n  }\n": types.UpdateAdvancedSettingsDocument,
    "\n  mutation UpdateSettingsRaw($json: String!) {\n    updateSettingsRaw(json: $json) {\n      appearance { theme fontSize compactMode zoomLevel }\n      ai { defaultModel cliPath cliSetupComplete autoCompactPercent }\n      advanced { developerMode focusMonitorEnabled focusMonitorIntervalMs }\n      permissions { activePreset rules { tool behavior entityType } }\n      notifications { mutedSources mutedTypes }\n    }\n  }\n": types.UpdateSettingsRawDocument,
    "\n  query GetNotificationSources {\n    notificationSources {\n      source\n      muted\n      types {\n        id\n        source\n        label\n        description\n        defaultEnabled\n        muted\n      }\n    }\n  }\n": types.GetNotificationSourcesDocument,
    "\n  mutation SetNotificationSourceMuted($source: String!, $muted: Boolean!) {\n    setNotificationSourceMuted(source: $source, muted: $muted) {\n      notifications { mutedSources mutedTypes }\n    }\n  }\n": types.SetNotificationSourceMutedDocument,
    "\n  mutation SetNotificationTypeMuted($typeId: String!, $muted: Boolean!) {\n    setNotificationTypeMuted(typeId: $typeId, muted: $muted) {\n      notifications { mutedSources mutedTypes }\n    }\n  }\n": types.SetNotificationTypeMutedDocument,
    "\n  mutation ResetNotificationMutes {\n    resetNotificationMutes {\n      notifications { mutedSources mutedTypes }\n    }\n  }\n": types.ResetNotificationMutesDocument,
    "\n  query GetRegistries {\n    registries {\n      id\n      name\n      url\n      enabled\n      priority\n      source\n      createdAt\n      updatedAt\n    }\n  }\n": types.GetRegistriesDocument,
    "\n  query GetRegistry($id: ID!) {\n    registry(id: $id) {\n      id\n      name\n      url\n      enabled\n      priority\n      source\n      createdAt\n      updatedAt\n    }\n  }\n": types.GetRegistryDocument,
    "\n  query GetRegistryQuickActions {\n    registryQuickActions {\n      id\n      label\n      icon\n      description\n      author { name }\n      tags\n      registry\n      options { id label prompt }\n    }\n  }\n": types.GetRegistryQuickActionsDocument,
    "\n  query GetRegistryQuickActionDefaults {\n    registryQuickActionDefaults\n  }\n": types.GetRegistryQuickActionDefaultsDocument,
    "\n  query GetRegistryVerificationActions {\n    registryVerificationActions {\n      id\n      type\n      label\n      builtinId\n      prompt\n    }\n  }\n": types.GetRegistryVerificationActionsDocument,
    "\n  query GetRegistryVerificationActionDefaults {\n    registryVerificationActionDefaults {\n      id\n      type\n      label\n      builtinId\n      prompt\n    }\n  }\n": types.GetRegistryVerificationActionDefaultsDocument,
    "\n  mutation AddRegistry($input: AddRegistryInput!) {\n    addRegistry(input: $input) {\n      registry {\n        id name url enabled priority source createdAt updatedAt\n      }\n    }\n  }\n": types.AddRegistryDocument,
    "\n  mutation RemoveRegistry($id: ID!) {\n    removeRegistry(id: $id) {\n      registry { id name }\n    }\n  }\n": types.RemoveRegistryDocument,
    "\n  mutation UpdateRegistry($id: ID!, $input: UpdateRegistryInput!) {\n    updateRegistry(id: $id, input: $input) {\n      registry {\n        id name url enabled priority updatedAt\n      }\n    }\n  }\n": types.UpdateRegistryDocument,
    "\n  mutation SyncRegistries {\n    syncRegistries {\n      synced\n    }\n  }\n": types.SyncRegistriesDocument,
    "\n  query GetInstalledSkills {\n    installedSkills {\n      id name description version registryVersion\n      source sourceRef registry path\n      icon category tags author\n      enabled pinned installDate lastUsed useCount\n      hasUpdate\n    }\n  }\n": types.GetInstalledSkillsDocument,
    "\n  query GetRegistrySkills {\n    registrySkills {\n      id name description version\n      source repo icon category tags\n      author { name }\n      registry\n    }\n  }\n": types.GetRegistrySkillsDocument,
    "\n  mutation InstallSkill($skillId: String!, $destination: String) {\n    installSkill(skillId: $skillId, destination: $destination) {\n      skill {\n        id name description version registryVersion\n        source sourceRef registry path\n        icon category tags author\n        enabled pinned installDate lastUsed useCount\n        hasUpdate\n      }\n    }\n  }\n": types.InstallSkillDocument,
    "\n  mutation UninstallSkill($skillId: String!) {\n    uninstallSkill(skillId: $skillId) {\n      success\n    }\n  }\n": types.UninstallSkillDocument,
    "\n  mutation UpdateSkill($skillId: String!) {\n    updateSkill(skillId: $skillId) {\n      skill {\n        id name description version registryVersion\n        source sourceRef registry path\n        icon category tags author\n        enabled pinned installDate lastUsed useCount\n        hasUpdate\n      }\n    }\n  }\n": types.UpdateSkillDocument,
    "\n  mutation ActivateSkill($skillId: String!) {\n    activateSkill(skillId: $skillId) {\n      body\n    }\n  }\n": types.ActivateSkillDocument,
    "\n  mutation ToggleSkillEnabled($skillId: String!, $enabled: Boolean!) {\n    toggleSkillEnabled(skillId: $skillId, enabled: $enabled) {\n      skill {\n        id enabled\n      }\n    }\n  }\n": types.ToggleSkillEnabledDocument,
    "\n  mutation ToggleSkillPinned($skillId: String!, $pinned: Boolean!) {\n    toggleSkillPinned(skillId: $skillId, pinned: $pinned) {\n      skill {\n        id pinned\n      }\n    }\n  }\n": types.ToggleSkillPinnedDocument,
    "\n  mutation SyncLocalSkills {\n    syncLocalSkills\n  }\n": types.SyncLocalSkillsDocument,
    "\n  query GetInstalledPlugins {\n    installedPlugins {\n      id name description version registryVersion\n      source sourceRef registry path\n      icon category tags author\n      enabled installDate\n      hasUpdate\n    }\n  }\n": types.GetInstalledPluginsDocument,
    "\n  query GetRegistryPlugins {\n    registryPlugins {\n      id name description version\n      source repo icon category tags\n      author { name }\n      registry\n      canvases { navSidebar drawer menuBar feed }\n    }\n  }\n": types.GetRegistryPluginsDocument,
    "\n  mutation InstallPlugin($pluginId: String!) {\n    installPlugin(pluginId: $pluginId) {\n      plugin {\n        id name description version registryVersion\n        source sourceRef registry path\n        icon category tags author\n        enabled installDate\n        hasUpdate\n      }\n    }\n  }\n": types.InstallPluginDocument,
    "\n  mutation UninstallPlugin($pluginId: String!) {\n    uninstallPlugin(pluginId: $pluginId) {\n      success\n    }\n  }\n": types.UninstallPluginDocument,
    "\n  mutation UpdatePlugin($pluginId: String!) {\n    updatePlugin(pluginId: $pluginId) {\n      plugin {\n        id name description version registryVersion\n        source sourceRef registry path\n        icon category tags author\n        enabled installDate\n        hasUpdate\n      }\n    }\n  }\n": types.UpdatePluginDocument,
    "\n  mutation TogglePluginEnabled($pluginId: String!, $enabled: Boolean!) {\n    togglePluginEnabled(pluginId: $pluginId, enabled: $enabled) {\n      plugin {\n        id enabled\n      }\n    }\n  }\n": types.TogglePluginEnabledDocument,
    "\n  query GetCommands($categoryFilter: String) {\n    commands(categoryFilter: $categoryFilter) {\n      id\n      category\n      title\n      description\n      keywords\n      disabled\n      disabledReason\n      hasFlow\n      body\n    }\n  }\n": types.GetCommandsDocument,
    "\n  mutation ExecuteCommand($commandId: String!, $args: JSON) {\n    executeCommand(commandId: $commandId, args: $args) {\n      success\n      error\n      action {\n        type\n        path\n        message\n        variant\n        text\n      }\n    }\n  }\n": types.ExecuteCommandDocument,
    "\n  mutation RescanClaudeCommands {\n    rescanClaudeCommands\n  }\n": types.RescanClaudeCommandsDocument,
    "\n  mutation UpdatePermissionsSettings($input: UpdatePermissionsSettingsInput!) {\n    updatePermissionsSettings(input: $input) {\n      appearance { theme fontSize compactMode zoomLevel }\n      ai { defaultModel cliPath cliSetupComplete autoCompactPercent }\n      advanced { developerMode focusMonitorEnabled focusMonitorIntervalMs }\n      permissions { activePreset rules { tool behavior entityType } }\n      notifications { mutedSources mutedTypes }\n    }\n  }\n": types.UpdatePermissionsSettingsDocument,
    "\n  query GetPermissionPolicy($scopeType: PermissionScopeType!, $scopeId: String!) {\n    permissionPolicy(scopeType: $scopeType, scopeId: $scopeId) {\n      id\n      scopeType\n      scopeId\n      rules { tool behavior entityType }\n      templateId\n      createdAt\n      updatedAt\n    }\n  }\n": types.GetPermissionPolicyDocument,
    "\n  mutation SetPermissionPolicy($scopeType: PermissionScopeType!, $scopeId: String!, $rules: [PermissionRuleConfigInput!]!) {\n    setPermissionPolicy(scopeType: $scopeType, scopeId: $scopeId, rules: $rules) {\n      id\n      scopeType\n      scopeId\n      rules { tool behavior entityType }\n      templateId\n    }\n  }\n": types.SetPermissionPolicyDocument,
    "\n  mutation DeletePermissionPolicy($scopeType: PermissionScopeType!, $scopeId: String!) {\n    deletePermissionPolicy(scopeType: $scopeType, scopeId: $scopeId)\n  }\n": types.DeletePermissionPolicyDocument,
    "\n  query GetResolvedPermissions($workstreamId: ID!) {\n    resolvedPermissions(workstreamId: $workstreamId) {\n      tool\n      behavior\n      entityType\n    }\n  }\n": types.GetResolvedPermissionsDocument,
    "\n  query GetResolvedParentPermissions($scopeType: PermissionScopeType!, $scopeId: String!) {\n    resolvedParentPermissions(scopeType: $scopeType, scopeId: $scopeId) {\n      tool\n      behavior\n      entityType\n    }\n  }\n": types.GetResolvedParentPermissionsDocument,
    "\n  query GetPermissionTemplates {\n    permissionTemplates {\n      id\n      name\n      description\n      rules { tool behavior entityType }\n      createdAt\n      updatedAt\n    }\n  }\n": types.GetPermissionTemplatesDocument,
    "\n  query GetPermissionTemplate($id: ID!) {\n    permissionTemplate(id: $id) {\n      id\n      name\n      description\n      rules { tool behavior entityType }\n      createdAt\n      updatedAt\n    }\n  }\n": types.GetPermissionTemplateDocument,
    "\n  mutation CreatePermissionTemplate($name: String!, $description: String, $rules: [PermissionRuleConfigInput!]!) {\n    createPermissionTemplate(name: $name, description: $description, rules: $rules) {\n      id\n      name\n      description\n      rules { tool behavior entityType }\n      createdAt\n      updatedAt\n    }\n  }\n": types.CreatePermissionTemplateDocument,
    "\n  mutation UpdatePermissionTemplate($id: ID!, $name: String, $description: String, $rules: [PermissionRuleConfigInput!]) {\n    updatePermissionTemplate(id: $id, name: $name, description: $description, rules: $rules) {\n      id\n      name\n      description\n      rules { tool behavior entityType }\n      createdAt\n      updatedAt\n    }\n  }\n": types.UpdatePermissionTemplateDocument,
    "\n  mutation DeletePermissionTemplate($id: ID!) {\n    deletePermissionTemplate(id: $id)\n  }\n": types.DeletePermissionTemplateDocument,
    "\n  mutation ApplyPermissionTemplate($templateId: ID!, $scopeType: PermissionScopeType!, $scopeId: String!) {\n    applyPermissionTemplate(templateId: $templateId, scopeType: $scopeType, scopeId: $scopeId)\n  }\n": types.ApplyPermissionTemplateDocument,
    "\n  query GetTagsByProject($projectId: ID!) {\n    tagsByProject(projectId: $projectId) {\n      name\n      instructions\n      color\n      maxDepth\n      spawnWorkstream\n      worktreeMode\n      dependsOn\n    }\n  }\n": types.GetTagsByProjectDocument,
    "\n  query GetTagByName($projectId: ID!, $name: String!) {\n    tagByName(projectId: $projectId, name: $name) {\n      name\n      instructions\n      color\n      maxDepth\n      spawnWorkstream\n      worktreeMode\n      dependsOn\n    }\n  }\n": types.GetTagByNameDocument,
    "\n  query GetWorkstreamTags($workstreamId: ID!) {\n    workstreamTags(workstreamId: $workstreamId) {\n      id\n      workstreamId\n      tagName\n      tagInstructions\n      tagColor\n      tagMaxDepth\n      tagSpawnWorkstream\n      tagWorktreeMode\n      tagDependsOn\n      status\n      appliedAt\n      startedAt\n      completedAt\n      error\n      appliedBy\n      depth\n      delegatedWorkstreamId\n    }\n  }\n": types.GetWorkstreamTagsDocument,
    "\n  mutation CreateTag($input: CreateTagInput!) {\n    createTag(input: $input) {\n      tag {\n        name\n        instructions\n        color\n        maxDepth\n        spawnWorkstream\n        worktreeMode\n        dependsOn\n      }\n    }\n  }\n": types.CreateTagDocument,
    "\n  mutation UpdateTag($projectId: ID!, $tagName: String!, $input: UpdateTagInput!) {\n    updateTag(projectId: $projectId, tagName: $tagName, input: $input) {\n      tag {\n        name\n        instructions\n        color\n        maxDepth\n        spawnWorkstream\n        worktreeMode\n        dependsOn\n      }\n    }\n  }\n": types.UpdateTagDocument,
    "\n  mutation DeleteTag($projectId: ID!, $tagName: String!) {\n    deleteTag(projectId: $projectId, tagName: $tagName) {\n      tag {\n        name\n      }\n    }\n  }\n": types.DeleteTagDocument,
    "\n  mutation ApplyTagToWorkstream($workstreamId: ID!, $tagName: String!) {\n    applyTagToWorkstream(workstreamId: $workstreamId, tagName: $tagName) {\n      workstreamTag {\n        id\n        workstreamId\n        tagName\n        tagColor\n        status\n        appliedAt\n        appliedBy\n        depth\n      }\n      pipelineRunId\n    }\n  }\n": types.ApplyTagToWorkstreamDocument,
    "\n  mutation RemoveTagFromWorkstream($workstreamId: ID!, $tagName: String!) {\n    removeTagFromWorkstream(workstreamId: $workstreamId, tagName: $tagName) {\n      success\n    }\n  }\n": types.RemoveTagFromWorkstreamDocument,
    "\n  query GetContentProfiles {\n    contentProfiles {\n      name\n      directory\n      isDefault\n      isActive\n      isFork\n      metadata {\n        displayName\n        description\n        author {\n          name\n          url\n        }\n        icon\n        tags\n        sourceUrl\n      }\n    }\n  }\n": types.GetContentProfilesDocument,
    "\n  query GetActiveContentProfile {\n    activeContentProfile {\n      name\n      directory\n      isDefault\n      isActive\n      isFork\n      metadata {\n        displayName\n        description\n        icon\n        tags\n        sourceUrl\n      }\n    }\n  }\n": types.GetActiveContentProfileDocument,
    "\n  mutation ForkContentProfile($gitUrl: String!, $name: String) {\n    forkContentProfile(gitUrl: $gitUrl, name: $name) {\n      name\n      directory\n      isDefault\n      isActive\n      isFork\n      metadata {\n        displayName\n        description\n        icon\n        sourceUrl\n      }\n    }\n  }\n": types.ForkContentProfileDocument,
    "\n  mutation SwitchContentProfile($name: String!) {\n    switchContentProfile(name: $name)\n  }\n": types.SwitchContentProfileDocument,
    "\n  mutation DeleteContentProfile($name: String!) {\n    deleteContentProfile(name: $name)\n  }\n": types.DeleteContentProfileDocument,
    "\n  query GetTask($id: ID!) {\n    task(id: $id) {\n      id\n      projectId\n      identifier\n      title\n      description\n      status\n      priority\n      assigneeType\n      assigneeWorkstreamId\n      dueDate\n      parentId\n      links\n      createdAt\n      updatedAt\n      labels {\n        id\n        name\n        color\n      }\n      subtasks {\n        id\n        identifier\n        title\n        status\n        priority\n      }\n      parent {\n        id\n        identifier\n        title\n      }\n    }\n  }\n": types.GetTaskDocument,
    "\n  query GetTasks($projectId: ID!, $status: TaskStatus, $priority: TaskPriority, $assigneeType: TaskAssigneeType, $labelId: String, $parentId: String, $query: String, $limit: Int) {\n    tasks(projectId: $projectId, status: $status, priority: $priority, assigneeType: $assigneeType, labelId: $labelId, parentId: $parentId, query: $query, limit: $limit) {\n      id\n      projectId\n      identifier\n      title\n      description\n      status\n      priority\n      assigneeType\n      assigneeWorkstreamId\n      dueDate\n      parentId\n      links\n      createdAt\n      updatedAt\n      labels {\n        id\n        name\n        color\n      }\n    }\n  }\n": types.GetTasksDocument,
    "\n  query GetTaskLabels($projectId: ID!) {\n    taskLabels(projectId: $projectId) {\n      id\n      projectId\n      name\n      color\n      createdAt\n    }\n  }\n": types.GetTaskLabelsDocument,
    "\n  mutation CreateTask($input: CreateTaskInput!) {\n    createTask(input: $input) {\n      task {\n        id\n        projectId\n        identifier\n        title\n        status\n        priority\n        createdAt\n      }\n    }\n  }\n": types.CreateTaskDocument,
    "\n  mutation UpdateTask($id: ID!, $input: UpdateTaskInput!) {\n    updateTask(id: $id, input: $input) {\n      task {\n        id\n        projectId\n        identifier\n        title\n        description\n        status\n        priority\n        assigneeType\n        assigneeWorkstreamId\n        dueDate\n        parentId\n        links\n        createdAt\n        updatedAt\n        labels {\n          id\n          name\n          color\n        }\n      }\n    }\n  }\n": types.UpdateTaskDocument,
    "\n  mutation DeleteTask($id: ID!) {\n    deleteTask(id: $id) {\n      success\n    }\n  }\n": types.DeleteTaskDocument,
    "\n  mutation CreateTaskLabel($projectId: ID!, $name: String!, $color: String!) {\n    createTaskLabel(projectId: $projectId, name: $name, color: $color) {\n      label {\n        id\n        projectId\n        name\n        color\n        createdAt\n      }\n    }\n  }\n": types.CreateTaskLabelDocument,
    "\n  mutation UpdateTaskLabel($id: ID!, $name: String, $color: String) {\n    updateTaskLabel(id: $id, name: $name, color: $color) {\n      label {\n        id\n        projectId\n        name\n        color\n        createdAt\n      }\n    }\n  }\n": types.UpdateTaskLabelDocument,
    "\n  mutation DeleteTaskLabel($id: ID!) {\n    deleteTaskLabel(id: $id) {\n      success\n    }\n  }\n": types.DeleteTaskLabelDocument,
    "\n  query GetInboxItems($includeArchived: Boolean, $includeRead: Boolean, $limit: Int, $offset: Int) {\n    inboxItems(includeArchived: $includeArchived, includeRead: $includeRead, limit: $limit, offset: $offset) {\n      id\n      title\n      description\n      icon\n      source\n      actions {\n        id\n        label\n        payload\n      }\n      entityUri\n      ctaLabel\n      read\n      archived\n      createdAt\n      updatedAt\n    }\n  }\n": types.GetInboxItemsDocument,
    "\n  query GetInboxUnreadCount {\n    inboxUnreadCount\n  }\n": types.GetInboxUnreadCountDocument,
    "\n  mutation PushInboxItem($input: PushInboxItemInput!) {\n    pushInboxItem(input: $input) {\n      inboxItem {\n        id\n        title\n        description\n        icon\n        source\n        actions {\n          id\n          label\n          payload\n        }\n        entityUri\n        ctaLabel\n        read\n        archived\n        createdAt\n        updatedAt\n      }\n    }\n  }\n": types.PushInboxItemDocument,
    "\n  mutation MarkInboxItemRead($id: ID!) {\n    markInboxItemRead(id: $id) {\n      inboxItem {\n        id\n        read\n      }\n    }\n  }\n": types.MarkInboxItemReadDocument,
    "\n  mutation MarkAllInboxItemsRead {\n    markAllInboxItemsRead {\n      count\n    }\n  }\n": types.MarkAllInboxItemsReadDocument,
    "\n  mutation ArchiveInboxItem($id: ID!) {\n    archiveInboxItem(id: $id) {\n      inboxItem {\n        id\n        archived\n      }\n    }\n  }\n": types.ArchiveInboxItemDocument,
    "\n  mutation DeleteInboxItem($id: ID!) {\n    deleteInboxItem(id: $id) {\n      success\n    }\n  }\n": types.DeleteInboxItemDocument,
    "\n  mutation ExecuteInboxAction($actionId: String!, $payload: JSON) {\n    executeInboxAction(actionId: $actionId, payload: $payload) {\n      success\n    }\n  }\n": types.ExecuteInboxActionDocument,
    "\n  query GetRegisteredEvents {\n    registeredEvents {\n      qualifiedName\n      localName\n      description\n      ownerPluginId\n      listenerCount\n      payloadSchema\n    }\n  }\n": types.GetRegisteredEventsDocument,
    "\n  query GetEntityToolEntries {\n    entityToolEntries {\n      uri\n      addedAt\n    }\n  }\n": types.GetEntityToolEntriesDocument,
    "\n  mutation AddEntityToolEntry($uri: String!) {\n    addEntityToolEntry(uri: $uri) {\n      entry {\n        uri\n        addedAt\n      }\n      alreadyExists\n    }\n  }\n": types.AddEntityToolEntryDocument,
    "\n  mutation RemoveEntityToolEntry($uri: String!) {\n    removeEntityToolEntry(uri: $uri) {\n      success\n    }\n  }\n": types.RemoveEntityToolEntryDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetProjects {\n    projects {\n      id\n      name\n      createdAt\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  query GetProjects {\n    projects {\n      id\n      name\n      createdAt\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetProject($id: ID!) {\n    project(id: $id) {\n      id\n      name\n      createdAt\n      updatedAt\n      workstreams {\n        id\n        title\n        status\n        isPinned\n        messageCount\n        lastActivityAt\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetProject($id: ID!) {\n    project(id: $id) {\n      id\n      name\n      createdAt\n      updatedAt\n      workstreams {\n        id\n        title\n        status\n        isPinned\n        messageCount\n        lastActivityAt\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateProject($input: CreateProjectInput!) {\n    createProject(input: $input) {\n      id\n      name\n      createdAt\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  mutation CreateProject($input: CreateProjectInput!) {\n    createProject(input: $input) {\n      id\n      name\n      createdAt\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {\n    updateProject(id: $id, input: $input) {\n      id\n      name\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {\n    updateProject(id: $id, input: $input) {\n      id\n      name\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteProject($id: ID!) {\n    deleteProject(id: $id)\n  }\n"): (typeof documents)["\n  mutation DeleteProject($id: ID!) {\n    deleteProject(id: $id)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetWorkstreamsByProject($projectId: ID!) {\n    workstreamsByProject(projectId: $projectId) {\n      id\n      title\n      status\n      model\n      isPinned\n      isRoutineWorkstream\n      groupId\n      messageCount\n      lastActivityAt\n      createdAt\n      updatedAt\n      inFocus\n    }\n  }\n"): (typeof documents)["\n  query GetWorkstreamsByProject($projectId: ID!) {\n    workstreamsByProject(projectId: $projectId) {\n      id\n      title\n      status\n      model\n      isPinned\n      isRoutineWorkstream\n      groupId\n      messageCount\n      lastActivityAt\n      createdAt\n      updatedAt\n      inFocus\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetWorkstream($id: ID!) {\n    workstream(id: $id) {\n      id\n      title\n      status\n      model\n      isPinned\n      messageCount\n      lastActivityAt\n      createdAt\n      updatedAt\n      project {\n        id\n        name\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetWorkstream($id: ID!) {\n    workstream(id: $id) {\n      id\n      title\n      status\n      model\n      isPinned\n      messageCount\n      lastActivityAt\n      createdAt\n      updatedAt\n      project {\n        id\n        name\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetArchivedWorkstreams($projectId: ID!) {\n    archivedWorkstreams(projectId: $projectId) {\n      id\n      title\n      status\n      messageCount\n      archivedAt\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  query GetArchivedWorkstreams($projectId: ID!) {\n    archivedWorkstreams(projectId: $projectId) {\n      id\n      title\n      status\n      messageCount\n      archivedAt\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateWorkstream($input: CreateWorkstreamInput!) {\n    createWorkstream(input: $input) {\n      workstream { id title status model isPinned messageCount createdAt }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateWorkstream($input: CreateWorkstreamInput!) {\n    createWorkstream(input: $input) {\n      workstream { id title status model isPinned messageCount createdAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ForkWorkstream($input: ForkWorkstreamInput!) {\n    forkWorkstream(input: $input) {\n      workstream { id title status model isPinned messageCount createdAt groupId }\n      worktrees { directoryPath branch worktreePath error }\n    }\n  }\n"): (typeof documents)["\n  mutation ForkWorkstream($input: ForkWorkstreamInput!) {\n    forkWorkstream(input: $input) {\n      workstream { id title status model isPinned messageCount createdAt groupId }\n      worktrees { directoryPath branch worktreePath error }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateWorkstream($id: ID!, $input: UpdateWorkstreamInput!) {\n    updateWorkstream(id: $id, input: $input) {\n      workstream { id title status model isPinned updatedAt }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateWorkstream($id: ID!, $input: UpdateWorkstreamInput!) {\n    updateWorkstream(id: $id, input: $input) {\n      workstream { id title status model isPinned updatedAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ArchiveWorkstream($id: ID!) {\n    archiveWorkstream(id: $id) {\n      workstream { id status archivedAt updatedAt }\n    }\n  }\n"): (typeof documents)["\n  mutation ArchiveWorkstream($id: ID!) {\n    archiveWorkstream(id: $id) {\n      workstream { id status archivedAt updatedAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UnarchiveWorkstream($id: ID!) {\n    unarchiveWorkstream(id: $id) {\n      workstream { id status archivedAt updatedAt }\n    }\n  }\n"): (typeof documents)["\n  mutation UnarchiveWorkstream($id: ID!) {\n    unarchiveWorkstream(id: $id) {\n      workstream { id status archivedAt updatedAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation PinWorkstream($id: ID!) {\n    pinWorkstream(id: $id) {\n      workstream { id isPinned }\n    }\n  }\n"): (typeof documents)["\n  mutation PinWorkstream($id: ID!) {\n    pinWorkstream(id: $id) {\n      workstream { id isPinned }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UnpinWorkstream($id: ID!) {\n    unpinWorkstream(id: $id) {\n      workstream { id isPinned }\n    }\n  }\n"): (typeof documents)["\n  mutation UnpinWorkstream($id: ID!) {\n    unpinWorkstream(id: $id) {\n      workstream { id isPinned }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteWorkstream($id: ID!) {\n    deleteWorkstream(id: $id) {\n      workstream { id }\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteWorkstream($id: ID!) {\n    deleteWorkstream(id: $id) {\n      workstream { id }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetEntity($uri: String!) {\n    entity(uri: $uri) {\n      id\n      type\n      uri\n      title\n      description\n      createdAt\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  query GetEntity($uri: String!) {\n    entity(uri: $uri) {\n      id\n      type\n      uri\n      title\n      description\n      createdAt\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetEntities($type: String!, $query: String, $filters: JSON, $limit: Int) {\n    entities(type: $type, query: $query, filters: $filters, limit: $limit) {\n      id\n      type\n      uri\n      title\n      description\n      createdAt\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  query GetEntities($type: String!, $query: String, $filters: JSON, $limit: Int) {\n    entities(type: $type, query: $query, filters: $filters, limit: $limit) {\n      id\n      type\n      uri\n      title\n      description\n      createdAt\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SearchEntities($query: String!, $types: [String!], $limit: Int) {\n    entitySearch(query: $query, types: $types, limit: $limit) {\n      id\n      type\n      uri\n      title\n      description\n      createdAt\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  query SearchEntities($query: String!, $types: [String!], $limit: Int) {\n    entitySearch(query: $query, types: $types, limit: $limit) {\n      id\n      type\n      uri\n      title\n      description\n      createdAt\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetEntityTypes {\n    entityTypes {\n      type\n      displayName\n      icon\n      source\n      uriExample\n      display\n    }\n  }\n"): (typeof documents)["\n  query GetEntityTypes {\n    entityTypes {\n      type\n      displayName\n      icon\n      source\n      uriExample\n      display\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetEntityMutationCatalog {\n    entityMutationCatalog {\n      entityType\n      entityDisplayName\n      mutations {\n        name\n        description\n        entityType\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetEntityMutationCatalog {\n    entityMutationCatalog {\n      entityType\n      entityDisplayName\n      mutations {\n        name\n        description\n        entityType\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetRoutines {\n    routines {\n      id\n      name\n      description\n      workstreamId\n      status\n      schedule { type expression timezone }\n      runCount\n      lastRunAt\n      nextRunAt\n      createdAt\n      updatedAt\n      latestRun { id status triggeredBy startedAt completedAt }\n    }\n  }\n"): (typeof documents)["\n  query GetRoutines {\n    routines {\n      id\n      name\n      description\n      workstreamId\n      status\n      schedule { type expression timezone }\n      runCount\n      lastRunAt\n      nextRunAt\n      createdAt\n      updatedAt\n      latestRun { id status triggeredBy startedAt completedAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetRoutinesByProject($projectId: ID!) {\n    routinesByProject(projectId: $projectId) {\n      id\n      name\n      description\n      workstreamId\n      status\n      schedule { type expression timezone }\n      runCount\n      lastRunAt\n      nextRunAt\n      createdAt\n      updatedAt\n      latestRun { id status triggeredBy startedAt completedAt }\n    }\n  }\n"): (typeof documents)["\n  query GetRoutinesByProject($projectId: ID!) {\n    routinesByProject(projectId: $projectId) {\n      id\n      name\n      description\n      workstreamId\n      status\n      schedule { type expression timezone }\n      runCount\n      lastRunAt\n      nextRunAt\n      createdAt\n      updatedAt\n      latestRun { id status triggeredBy startedAt completedAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetRoutine($id: ID!) {\n    routine(id: $id) {\n      id\n      name\n      description\n      prompt\n      workstreamId\n      status\n      schedule { type expression timezone }\n      preferences\n      runCount\n      lastRunAt\n      nextRunAt\n      createdAt\n      updatedAt\n      workstream { id title status }\n      latestRun { id status triggeredBy startedAt completedAt summary error }\n    }\n  }\n"): (typeof documents)["\n  query GetRoutine($id: ID!) {\n    routine(id: $id) {\n      id\n      name\n      description\n      prompt\n      workstreamId\n      status\n      schedule { type expression timezone }\n      preferences\n      runCount\n      lastRunAt\n      nextRunAt\n      createdAt\n      updatedAt\n      workstream { id title status }\n      latestRun { id status triggeredBy startedAt completedAt summary error }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetRoutineByWorkstream($workstreamId: ID!) {\n    routineByWorkstreamId(workstreamId: $workstreamId) {\n      id\n      name\n      description\n      prompt\n      status\n      schedule { type expression timezone }\n      runCount\n      lastRunAt\n      nextRunAt\n    }\n  }\n"): (typeof documents)["\n  query GetRoutineByWorkstream($workstreamId: ID!) {\n    routineByWorkstreamId(workstreamId: $workstreamId) {\n      id\n      name\n      description\n      prompt\n      status\n      schedule { type expression timezone }\n      runCount\n      lastRunAt\n      nextRunAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetRoutineRunHistory($routineId: ID!, $limit: Int) {\n    routineRunHistory(routineId: $routineId, limit: $limit) {\n      id\n      routineId\n      status\n      triggeredBy\n      startedAt\n      completedAt\n      summary\n      error\n      createdAt\n    }\n  }\n"): (typeof documents)["\n  query GetRoutineRunHistory($routineId: ID!, $limit: Int) {\n    routineRunHistory(routineId: $routineId, limit: $limit) {\n      id\n      routineId\n      status\n      triggeredBy\n      startedAt\n      completedAt\n      summary\n      error\n      createdAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetRoutineLatestRun($routineId: ID!) {\n    routineLatestRun(routineId: $routineId) {\n      id\n      status\n      triggeredBy\n      startedAt\n      completedAt\n      summary\n      error\n    }\n  }\n"): (typeof documents)["\n  query GetRoutineLatestRun($routineId: ID!) {\n    routineLatestRun(routineId: $routineId) {\n      id\n      status\n      triggeredBy\n      startedAt\n      completedAt\n      summary\n      error\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateRoutine($input: CreateRoutineInput!) {\n    createRoutine(input: $input) {\n      routine {\n        id name description prompt workstreamId status\n        schedule { type expression timezone }\n        runCount createdAt\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateRoutine($input: CreateRoutineInput!) {\n    createRoutine(input: $input) {\n      routine {\n        id name description prompt workstreamId status\n        schedule { type expression timezone }\n        runCount createdAt\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateRoutine($id: ID!, $input: UpdateRoutineInput!) {\n    updateRoutine(id: $id, input: $input) {\n      routine {\n        id name description prompt status\n        schedule { type expression timezone }\n        updatedAt\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateRoutine($id: ID!, $input: UpdateRoutineInput!) {\n    updateRoutine(id: $id, input: $input) {\n      routine {\n        id name description prompt status\n        schedule { type expression timezone }\n        updatedAt\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteRoutine($id: ID!) {\n    deleteRoutine(id: $id) {\n      routine { id name }\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteRoutine($id: ID!) {\n    deleteRoutine(id: $id) {\n      routine { id name }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation PauseRoutine($id: ID!) {\n    pauseRoutine(id: $id) {\n      routine { id status updatedAt }\n    }\n  }\n"): (typeof documents)["\n  mutation PauseRoutine($id: ID!) {\n    pauseRoutine(id: $id) {\n      routine { id status updatedAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ResumeRoutine($id: ID!) {\n    resumeRoutine(id: $id) {\n      routine { id status nextRunAt updatedAt }\n    }\n  }\n"): (typeof documents)["\n  mutation ResumeRoutine($id: ID!) {\n    resumeRoutine(id: $id) {\n      routine { id status nextRunAt updatedAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RunRoutineNow($id: ID!) {\n    runRoutineNow(id: $id) {\n      routine {\n        id status runCount lastRunAt\n        latestRun { id status triggeredBy startedAt completedAt }\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation RunRoutineNow($id: ID!) {\n    runRoutineNow(id: $id) {\n      routine {\n        id status runCount lastRunAt\n        latestRun { id status triggeredBy startedAt completedAt }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SendWorkstreamMessage($workstreamId: ID!, $text: String!, $imageAttachments: [ImageAttachmentInput!], $imageContentBlocks: [ImageContentBlockInput!]) {\n    sendWorkstreamMessage(workstreamId: $workstreamId, text: $text, imageAttachments: $imageAttachments, imageContentBlocks: $imageContentBlocks) {\n      workstream { id status messageCount lastActivityAt updatedAt }\n    }\n  }\n"): (typeof documents)["\n  mutation SendWorkstreamMessage($workstreamId: ID!, $text: String!, $imageAttachments: [ImageAttachmentInput!], $imageContentBlocks: [ImageContentBlockInput!]) {\n    sendWorkstreamMessage(workstreamId: $workstreamId, text: $text, imageAttachments: $imageAttachments, imageContentBlocks: $imageContentBlocks) {\n      workstream { id status messageCount lastActivityAt updatedAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation StopWorkstreamAgent($id: ID!) {\n    stopWorkstreamAgent(id: $id) {\n      workstream { id status updatedAt }\n    }\n  }\n"): (typeof documents)["\n  mutation StopWorkstreamAgent($id: ID!) {\n    stopWorkstreamAgent(id: $id) {\n      workstream { id status updatedAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RestartWorkstreamAgent($id: ID!) {\n    restartWorkstreamAgent(id: $id) {\n      workstream { id status updatedAt }\n    }\n  }\n"): (typeof documents)["\n  mutation RestartWorkstreamAgent($id: ID!) {\n    restartWorkstreamAgent(id: $id) {\n      workstream { id status updatedAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RespondWorkstreamPermission($workstreamId: ID!, $requestId: String!, $response: PermissionResponseInput!) {\n    respondWorkstreamPermission(workstreamId: $workstreamId, requestId: $requestId, response: $response) {\n      workstream { id status updatedAt }\n    }\n  }\n"): (typeof documents)["\n  mutation RespondWorkstreamPermission($workstreamId: ID!, $requestId: String!, $response: PermissionResponseInput!) {\n    respondWorkstreamPermission(workstreamId: $workstreamId, requestId: $requestId, response: $response) {\n      workstream { id status updatedAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RevokePermissionRule($workstreamId: ID!, $toolName: String!, $scope: PermissionRuleScope!) {\n    revokePermissionRule(workstreamId: $workstreamId, toolName: $toolName, scope: $scope) {\n      workstream { id status updatedAt }\n    }\n  }\n"): (typeof documents)["\n  mutation RevokePermissionRule($workstreamId: ID!, $toolName: String!, $scope: PermissionRuleScope!) {\n    revokePermissionRule(workstreamId: $workstreamId, toolName: $toolName, scope: $scope) {\n      workstream { id status updatedAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation InterruptWorkstreamAgent($id: ID!) {\n    interruptWorkstreamAgent(id: $id) {\n      workstream { id status updatedAt }\n    }\n  }\n"): (typeof documents)["\n  mutation InterruptWorkstreamAgent($id: ID!) {\n    interruptWorkstreamAgent(id: $id) {\n      workstream { id status updatedAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ClearWorkstreamConversation($id: ID!) {\n    clearWorkstreamConversation(id: $id) {\n      workstream { id status updatedAt }\n    }\n  }\n"): (typeof documents)["\n  mutation ClearWorkstreamConversation($id: ID!) {\n    clearWorkstreamConversation(id: $id) {\n      workstream { id status updatedAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CompactWorkstreamConversation($id: ID!, $instructions: String) {\n    compactWorkstreamConversation(id: $id, instructions: $instructions) {\n      workstream { id status updatedAt }\n    }\n  }\n"): (typeof documents)["\n  mutation CompactWorkstreamConversation($id: ID!, $instructions: String) {\n    compactWorkstreamConversation(id: $id, instructions: $instructions) {\n      workstream { id status updatedAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RewindWorkstreamConversation($id: ID!, $eventId: Int!, $role: String) {\n    rewindWorkstreamConversation(id: $id, eventId: $eventId, role: $role) {\n      workstream { id status updatedAt }\n    }\n  }\n"): (typeof documents)["\n  mutation RewindWorkstreamConversation($id: ID!, $eventId: Int!, $role: String) {\n    rewindWorkstreamConversation(id: $id, eventId: $eventId, role: $role) {\n      workstream { id status updatedAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetWorkstreamInFocus($id: ID) {\n    setWorkstreamInFocus(id: $id) {\n      workstream { id status updatedAt inFocus }\n    }\n  }\n"): (typeof documents)["\n  mutation SetWorkstreamInFocus($id: ID) {\n    setWorkstreamInFocus(id: $id) {\n      workstream { id status updatedAt inFocus }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ReplayWorkstreamHistory($id: ID!) {\n    replayWorkstreamHistory(id: $id) {\n      workstream { id status updatedAt }\n      hasMore\n      oldestEventId\n    }\n  }\n"): (typeof documents)["\n  mutation ReplayWorkstreamHistory($id: ID!) {\n    replayWorkstreamHistory(id: $id) {\n      workstream { id status updatedAt }\n      hasMore\n      oldestEventId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation LoadMoreWorkstreamHistory($id: ID!, $beforeEventId: Int!, $limit: Int) {\n    loadMoreWorkstreamHistory(id: $id, beforeEventId: $beforeEventId, limit: $limit) {\n      workstream { id status updatedAt }\n      hasMore\n      oldestEventId\n    }\n  }\n"): (typeof documents)["\n  mutation LoadMoreWorkstreamHistory($id: ID!, $beforeEventId: Int!, $limit: Int) {\n    loadMoreWorkstreamHistory(id: $id, beforeEventId: $beforeEventId, limit: $limit) {\n      workstream { id status updatedAt }\n      hasMore\n      oldestEventId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query IsWorkstreamAgentRunning($id: ID!) {\n    isWorkstreamAgentRunning(id: $id)\n  }\n"): (typeof documents)["\n  query IsWorkstreamAgentRunning($id: ID!) {\n    isWorkstreamAgentRunning(id: $id)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetUserMessageHistory($workstreamId: ID!, $limit: Int, $before: Int) {\n    userMessageHistory(workstreamId: $workstreamId, limit: $limit, before: $before) {\n      items {\n        eventId\n        messageId\n        text\n        timestamp\n      }\n      hasMore\n    }\n  }\n"): (typeof documents)["\n  query GetUserMessageHistory($workstreamId: ID!, $limit: Int, $before: Int) {\n    userMessageHistory(workstreamId: $workstreamId, limit: $limit, before: $before) {\n      items {\n        eventId\n        messageId\n        text\n        timestamp\n      }\n      hasMore\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetWorkstreamLinkedEntities($workstreamId: ID!) {\n    workstreamLinkedEntities(workstreamId: $workstreamId) {\n      workstreamId\n      entityUri\n      entityType\n      entityTitle\n      contextOverride\n      createdAt\n      isInherited\n    }\n  }\n"): (typeof documents)["\n  query GetWorkstreamLinkedEntities($workstreamId: ID!) {\n    workstreamLinkedEntities(workstreamId: $workstreamId) {\n      workstreamId\n      entityUri\n      entityType\n      entityTitle\n      contextOverride\n      createdAt\n      isInherited\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetWorkstreamDirectories($workstreamId: ID!) {\n    workstreamDirectories(workstreamId: $workstreamId) {\n      id\n      workstreamId\n      path\n      label\n      isInherited\n      createdAt\n    }\n  }\n"): (typeof documents)["\n  query GetWorkstreamDirectories($workstreamId: ID!) {\n    workstreamDirectories(workstreamId: $workstreamId) {\n      id\n      workstreamId\n      path\n      label\n      isInherited\n      createdAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SwitchWorkstreamModel($id: ID!, $model: String!) {\n    switchWorkstreamModel(id: $id, model: $model) {\n      workstream { id model updatedAt }\n    }\n  }\n"): (typeof documents)["\n  mutation SwitchWorkstreamModel($id: ID!, $model: String!) {\n    switchWorkstreamModel(id: $id, model: $model) {\n      workstream { id model updatedAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation LinkWorkstreamEntity($workstreamId: ID!, $entityUri: String!, $entityType: String!, $entityTitle: String) {\n    linkWorkstreamEntity(workstreamId: $workstreamId, entityUri: $entityUri, entityType: $entityType, entityTitle: $entityTitle) {\n      workstream { id updatedAt }\n    }\n  }\n"): (typeof documents)["\n  mutation LinkWorkstreamEntity($workstreamId: ID!, $entityUri: String!, $entityType: String!, $entityTitle: String) {\n    linkWorkstreamEntity(workstreamId: $workstreamId, entityUri: $entityUri, entityType: $entityType, entityTitle: $entityTitle) {\n      workstream { id updatedAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UnlinkWorkstreamEntity($workstreamId: ID!, $entityUri: String!) {\n    unlinkWorkstreamEntity(workstreamId: $workstreamId, entityUri: $entityUri) {\n      workstream { id updatedAt }\n    }\n  }\n"): (typeof documents)["\n  mutation UnlinkWorkstreamEntity($workstreamId: ID!, $entityUri: String!) {\n    unlinkWorkstreamEntity(workstreamId: $workstreamId, entityUri: $entityUri) {\n      workstream { id updatedAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetLinkedEntityContextOverride($workstreamId: ID!, $entityUri: String!, $contextOverride: String) {\n    setLinkedEntityContextOverride(workstreamId: $workstreamId, entityUri: $entityUri, contextOverride: $contextOverride) {\n      workstream { id updatedAt }\n    }\n  }\n"): (typeof documents)["\n  mutation SetLinkedEntityContextOverride($workstreamId: ID!, $entityUri: String!, $contextOverride: String) {\n    setLinkedEntityContextOverride(workstreamId: $workstreamId, entityUri: $entityUri, contextOverride: $contextOverride) {\n      workstream { id updatedAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetWorkstreamReferences($workstreamId: ID!) {\n    workstreamReferences(workstreamId: $workstreamId) {\n      workstreamId\n      entityUri\n      entityType\n      entityTitle\n      externalUrl\n      firstReferencedAt\n    }\n  }\n"): (typeof documents)["\n  query GetWorkstreamReferences($workstreamId: ID!) {\n    workstreamReferences(workstreamId: $workstreamId) {\n      workstreamId\n      entityUri\n      entityType\n      entityTitle\n      externalUrl\n      firstReferencedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AddWorkstreamReference($workstreamId: ID!, $entityUri: String!, $entityType: String!, $entityTitle: String) {\n    addWorkstreamReference(workstreamId: $workstreamId, entityUri: $entityUri, entityType: $entityType, entityTitle: $entityTitle) {\n      workstream { id updatedAt }\n    }\n  }\n"): (typeof documents)["\n  mutation AddWorkstreamReference($workstreamId: ID!, $entityUri: String!, $entityType: String!, $entityTitle: String) {\n    addWorkstreamReference(workstreamId: $workstreamId, entityUri: $entityUri, entityType: $entityType, entityTitle: $entityTitle) {\n      workstream { id updatedAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RemoveWorkstreamReference($workstreamId: ID!, $entityUri: String!) {\n    removeWorkstreamReference(workstreamId: $workstreamId, entityUri: $entityUri) {\n      workstream { id updatedAt }\n    }\n  }\n"): (typeof documents)["\n  mutation RemoveWorkstreamReference($workstreamId: ID!, $entityUri: String!) {\n    removeWorkstreamReference(workstreamId: $workstreamId, entityUri: $entityUri) {\n      workstream { id updatedAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation PromoteWorkstreamReference($workstreamId: ID!, $entityUri: String!, $entityType: String!, $entityTitle: String) {\n    promoteWorkstreamReference(workstreamId: $workstreamId, entityUri: $entityUri, entityType: $entityType, entityTitle: $entityTitle) {\n      workstream { id updatedAt }\n    }\n  }\n"): (typeof documents)["\n  mutation PromoteWorkstreamReference($workstreamId: ID!, $entityUri: String!, $entityType: String!, $entityTitle: String) {\n    promoteWorkstreamReference(workstreamId: $workstreamId, entityUri: $entityUri, entityType: $entityType, entityTitle: $entityTitle) {\n      workstream { id updatedAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetWorkstreamsByEntity($entityUri: String!) {\n    workstreamsByEntity(entityUri: $entityUri) {\n      entityUri\n      entityType\n      entityTitle\n      workstreamId\n      groupId\n      createdAt\n      workstream {\n        id\n        title\n        status\n        groupId\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetWorkstreamsByEntity($entityUri: String!) {\n    workstreamsByEntity(entityUri: $entityUri) {\n      entityUri\n      entityType\n      entityTitle\n      workstreamId\n      groupId\n      createdAt\n      workstream {\n        id\n        title\n        status\n        groupId\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ResolveLinkedEntityContext($entityUri: String!) {\n    resolveLinkedEntityContext(entityUri: $entityUri)\n  }\n"): (typeof documents)["\n  query ResolveLinkedEntityContext($entityUri: String!) {\n    resolveLinkedEntityContext(entityUri: $entityUri)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query EntitySearch($query: String!, $types: [String!], $limit: Int) {\n    entitySearch(query: $query, types: $types, limit: $limit) {\n      id\n      type\n      uri\n      title\n    }\n  }\n"): (typeof documents)["\n  query EntitySearch($query: String!, $types: [String!], $limit: Int) {\n    entitySearch(query: $query, types: $types, limit: $limit) {\n      id\n      type\n      uri\n      title\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AddWorkstreamDirectory($workstreamId: ID!, $path: String!, $label: String) {\n    addWorkstreamDirectory(workstreamId: $workstreamId, path: $path, label: $label) {\n      workstream { id updatedAt }\n    }\n  }\n"): (typeof documents)["\n  mutation AddWorkstreamDirectory($workstreamId: ID!, $path: String!, $label: String) {\n    addWorkstreamDirectory(workstreamId: $workstreamId, path: $path, label: $label) {\n      workstream { id updatedAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RemoveWorkstreamDirectory($workstreamId: ID!, $path: String!) {\n    removeWorkstreamDirectory(workstreamId: $workstreamId, path: $path) {\n      workstream { id updatedAt }\n    }\n  }\n"): (typeof documents)["\n  mutation RemoveWorkstreamDirectory($workstreamId: ID!, $path: String!) {\n    removeWorkstreamDirectory(workstreamId: $workstreamId, path: $path) {\n      workstream { id updatedAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetProjectDirectories($projectId: ID!) {\n    projectDirectories(projectId: $projectId) {\n      id\n      projectId\n      path\n      label\n      createdAt\n    }\n  }\n"): (typeof documents)["\n  query GetProjectDirectories($projectId: ID!) {\n    projectDirectories(projectId: $projectId) {\n      id\n      projectId\n      path\n      label\n      createdAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AddProjectDirectory($projectId: ID!, $path: String!, $label: String) {\n    addProjectDirectory(projectId: $projectId, path: $path, label: $label) {\n      project { id updatedAt }\n      directory { id path label createdAt }\n    }\n  }\n"): (typeof documents)["\n  mutation AddProjectDirectory($projectId: ID!, $path: String!, $label: String) {\n    addProjectDirectory(projectId: $projectId, path: $path, label: $label) {\n      project { id updatedAt }\n      directory { id path label createdAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RemoveProjectDirectory($projectId: ID!, $path: String!) {\n    removeProjectDirectory(projectId: $projectId, path: $path) {\n      project { id updatedAt }\n      removed\n    }\n  }\n"): (typeof documents)["\n  mutation RemoveProjectDirectory($projectId: ID!, $path: String!) {\n    removeProjectDirectory(projectId: $projectId, path: $path) {\n      project { id updatedAt }\n      removed\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetBranchSelections($workstreamId: ID!) {\n    branchSelections(workstreamId: $workstreamId) {\n      id\n      workstreamId\n      directoryPath\n      branch\n      worktreePath\n      baseBranch\n      createdAt\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  query GetBranchSelections($workstreamId: ID!) {\n    branchSelections(workstreamId: $workstreamId) {\n      id\n      workstreamId\n      directoryPath\n      branch\n      worktreePath\n      baseBranch\n      createdAt\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetDirectoriesWithBranchInfo($workstreamId: ID!) {\n    directoriesWithBranchInfo(workstreamId: $workstreamId) {\n      path\n      effectivePath\n      label\n      branch\n      baseBranch\n      worktreePath\n      isInherited\n    }\n  }\n"): (typeof documents)["\n  query GetDirectoriesWithBranchInfo($workstreamId: ID!) {\n    directoriesWithBranchInfo(workstreamId: $workstreamId) {\n      path\n      effectivePath\n      label\n      branch\n      baseBranch\n      worktreePath\n      isInherited\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetBranchSelection(\n    $workstreamId: ID!\n    $directoryPath: String!\n    $branch: String!\n    $worktreePath: String\n    $baseBranch: String\n    $createWorktree: Boolean\n  ) {\n    setBranchSelection(\n      workstreamId: $workstreamId\n      directoryPath: $directoryPath\n      branch: $branch\n      worktreePath: $worktreePath\n      baseBranch: $baseBranch\n      createWorktree: $createWorktree\n    ) {\n      branchSelection {\n        id\n        directoryPath\n        branch\n        worktreePath\n        baseBranch\n        updatedAt\n      }\n      worktreeError\n    }\n  }\n"): (typeof documents)["\n  mutation SetBranchSelection(\n    $workstreamId: ID!\n    $directoryPath: String!\n    $branch: String!\n    $worktreePath: String\n    $baseBranch: String\n    $createWorktree: Boolean\n  ) {\n    setBranchSelection(\n      workstreamId: $workstreamId\n      directoryPath: $directoryPath\n      branch: $branch\n      worktreePath: $worktreePath\n      baseBranch: $baseBranch\n      createWorktree: $createWorktree\n    ) {\n      branchSelection {\n        id\n        directoryPath\n        branch\n        worktreePath\n        baseBranch\n        updatedAt\n      }\n      worktreeError\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RemoveBranchSelection($workstreamId: ID!, $directoryPath: String!) {\n    removeBranchSelection(workstreamId: $workstreamId, directoryPath: $directoryPath) {\n      removed\n    }\n  }\n"): (typeof documents)["\n  mutation RemoveBranchSelection($workstreamId: ID!, $directoryPath: String!) {\n    removeBranchSelection(workstreamId: $workstreamId, directoryPath: $directoryPath) {\n      removed\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetGroupDirectoriesWithBranches($groupId: ID!) {\n    workstreamGroup(id: $groupId) {\n      id\n      autoCreateWorktrees\n      directories {\n        id\n        path\n        label\n      }\n      branchSelections {\n        id\n        directoryPath\n        branch\n        baseBranch\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetGroupDirectoriesWithBranches($groupId: ID!) {\n    workstreamGroup(id: $groupId) {\n      id\n      autoCreateWorktrees\n      directories {\n        id\n        path\n        label\n      }\n      branchSelections {\n        id\n        directoryPath\n        branch\n        baseBranch\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AddGroupDirectory($groupId: ID!, $path: String!, $label: String) {\n    addGroupDirectory(groupId: $groupId, path: $path, label: $label) {\n      group { id }\n    }\n  }\n"): (typeof documents)["\n  mutation AddGroupDirectory($groupId: ID!, $path: String!, $label: String) {\n    addGroupDirectory(groupId: $groupId, path: $path, label: $label) {\n      group { id }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RemoveGroupDirectory($groupId: ID!, $path: String!) {\n    removeGroupDirectory(groupId: $groupId, path: $path) {\n      group { id }\n    }\n  }\n"): (typeof documents)["\n  mutation RemoveGroupDirectory($groupId: ID!, $path: String!) {\n    removeGroupDirectory(groupId: $groupId, path: $path) {\n      group { id }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetGroupBranchSelection($groupId: ID!, $directoryPath: String!, $branch: String!, $baseBranch: String) {\n    setGroupBranchSelection(groupId: $groupId, directoryPath: $directoryPath, branch: $branch, baseBranch: $baseBranch) {\n      group { id }\n    }\n  }\n"): (typeof documents)["\n  mutation SetGroupBranchSelection($groupId: ID!, $directoryPath: String!, $branch: String!, $baseBranch: String) {\n    setGroupBranchSelection(groupId: $groupId, directoryPath: $directoryPath, branch: $branch, baseBranch: $baseBranch) {\n      group { id }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RemoveGroupBranchSelection($groupId: ID!, $directoryPath: String!) {\n    removeGroupBranchSelection(groupId: $groupId, directoryPath: $directoryPath) {\n      group { id }\n    }\n  }\n"): (typeof documents)["\n  mutation RemoveGroupBranchSelection($groupId: ID!, $directoryPath: String!) {\n    removeGroupBranchSelection(groupId: $groupId, directoryPath: $directoryPath) {\n      group { id }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateGroupAutoCreateWorktrees($id: ID!, $autoCreateWorktrees: Boolean!) {\n    updateWorkstreamGroup(id: $id, input: { autoCreateWorktrees: $autoCreateWorktrees }) {\n      group { id autoCreateWorktrees }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateGroupAutoCreateWorktrees($id: ID!, $autoCreateWorktrees: Boolean!) {\n    updateWorkstreamGroup(id: $id, input: { autoCreateWorktrees: $autoCreateWorktrees }) {\n      group { id autoCreateWorktrees }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ArchiveWorkstreamGroup($id: ID!) {\n    archiveWorkstreamGroup(id: $id) {\n      group { id }\n    }\n  }\n"): (typeof documents)["\n  mutation ArchiveWorkstreamGroup($id: ID!) {\n    archiveWorkstreamGroup(id: $id) {\n      group { id }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetWorkstreamGroupsByProject($projectId: ID!) {\n    workstreamGroupsByProject(projectId: $projectId) {\n      id\n      name\n      emoji\n      isPinned\n      autoCreateWorktrees\n    }\n  }\n"): (typeof documents)["\n  query GetWorkstreamGroupsByProject($projectId: ID!) {\n    workstreamGroupsByProject(projectId: $projectId) {\n      id\n      name\n      emoji\n      isPinned\n      autoCreateWorktrees\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateWorkstreamGroup($input: CreateWorkstreamGroupInput!) {\n    createWorkstreamGroup(input: $input) {\n      group { id name emoji isPinned }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateWorkstreamGroup($input: CreateWorkstreamGroupInput!) {\n    createWorkstreamGroup(input: $input) {\n      group { id name emoji isPinned }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateWorkstreamGroup($id: ID!, $input: UpdateWorkstreamGroupInput!) {\n    updateWorkstreamGroup(id: $id, input: $input) {\n      group { id name emoji isPinned }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateWorkstreamGroup($id: ID!, $input: UpdateWorkstreamGroupInput!) {\n    updateWorkstreamGroup(id: $id, input: $input) {\n      group { id name emoji isPinned }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation PinWorkstreamGroup($id: ID!) {\n    pinWorkstreamGroup(id: $id) {\n      group { id isPinned }\n    }\n  }\n"): (typeof documents)["\n  mutation PinWorkstreamGroup($id: ID!) {\n    pinWorkstreamGroup(id: $id) {\n      group { id isPinned }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UnpinWorkstreamGroup($id: ID!) {\n    unpinWorkstreamGroup(id: $id) {\n      group { id isPinned }\n    }\n  }\n"): (typeof documents)["\n  mutation UnpinWorkstreamGroup($id: ID!) {\n    unpinWorkstreamGroup(id: $id) {\n      group { id isPinned }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteWorkstreamGroup($id: ID!) {\n    deleteWorkstreamGroup(id: $id) {\n      group { id }\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteWorkstreamGroup($id: ID!) {\n    deleteWorkstreamGroup(id: $id) {\n      group { id }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AddWorkstreamToGroup($workstreamId: ID!, $groupId: ID!) {\n    addWorkstreamToGroup(workstreamId: $workstreamId, groupId: $groupId) {\n      workstream { id groupId }\n    }\n  }\n"): (typeof documents)["\n  mutation AddWorkstreamToGroup($workstreamId: ID!, $groupId: ID!) {\n    addWorkstreamToGroup(workstreamId: $workstreamId, groupId: $groupId) {\n      workstream { id groupId }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RemoveWorkstreamFromGroup($workstreamId: ID!) {\n    removeWorkstreamFromGroup(workstreamId: $workstreamId) {\n      workstream { id groupId }\n    }\n  }\n"): (typeof documents)["\n  mutation RemoveWorkstreamFromGroup($workstreamId: ID!) {\n    removeWorkstreamFromGroup(workstreamId: $workstreamId) {\n      workstream { id groupId }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation LinkGroupEntity($groupId: ID!, $entityUri: String!, $entityType: String!, $entityTitle: String) {\n    linkGroupEntity(groupId: $groupId, entityUri: $entityUri, entityType: $entityType, entityTitle: $entityTitle) {\n      group { id }\n    }\n  }\n"): (typeof documents)["\n  mutation LinkGroupEntity($groupId: ID!, $entityUri: String!, $entityType: String!, $entityTitle: String) {\n    linkGroupEntity(groupId: $groupId, entityUri: $entityUri, entityType: $entityType, entityTitle: $entityTitle) {\n      group { id }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UnlinkGroupEntity($groupId: ID!, $entityUri: String!) {\n    unlinkGroupEntity(groupId: $groupId, entityUri: $entityUri) {\n      group { id }\n    }\n  }\n"): (typeof documents)["\n  mutation UnlinkGroupEntity($groupId: ID!, $entityUri: String!) {\n    unlinkGroupEntity(groupId: $groupId, entityUri: $entityUri) {\n      group { id }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetGroupLinkedEntities($groupId: ID!) {\n    groupLinkedEntities(groupId: $groupId) {\n      groupId\n      entityUri\n      entityType\n      entityTitle\n      contextOverride\n      createdAt\n    }\n  }\n"): (typeof documents)["\n  query GetGroupLinkedEntities($groupId: ID!) {\n    groupLinkedEntities(groupId: $groupId) {\n      groupId\n      entityUri\n      entityType\n      entityTitle\n      contextOverride\n      createdAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query IsGitRepo($path: String!) {\n    isGitRepo(path: $path)\n  }\n"): (typeof documents)["\n  query IsGitRepo($path: String!) {\n    isGitRepo(path: $path)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetGitBranches($path: String!) {\n    gitBranches(path: $path) {\n      name\n      isCurrent\n      isRemote\n      hasWorktree\n      worktreePath\n    }\n  }\n"): (typeof documents)["\n  query GetGitBranches($path: String!) {\n    gitBranches(path: $path) {\n      name\n      isCurrent\n      isRemote\n      hasWorktree\n      worktreePath\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetGitCurrentBranch($path: String!) {\n    gitCurrentBranch(path: $path)\n  }\n"): (typeof documents)["\n  query GetGitCurrentBranch($path: String!) {\n    gitCurrentBranch(path: $path)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetGitDefaultBranch($path: String!) {\n    gitDefaultBranch(path: $path)\n  }\n"): (typeof documents)["\n  query GetGitDefaultBranch($path: String!) {\n    gitDefaultBranch(path: $path)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetGitDiffSummary($path: String!, $base: String!) {\n    gitDiffSummary(path: $path, base: $base) {\n      additions\n      deletions\n      files {\n        path\n        status\n        oldPath\n        staged\n        additions\n        deletions\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetGitDiffSummary($path: String!, $base: String!) {\n    gitDiffSummary(path: $path, base: $base) {\n      additions\n      deletions\n      files {\n        path\n        status\n        oldPath\n        staged\n        additions\n        deletions\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetGitWorkingTreeSummary($path: String!) {\n    gitWorkingTreeSummary(path: $path) {\n      additions\n      deletions\n      files {\n        path\n        status\n        oldPath\n        staged\n        additions\n        deletions\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetGitWorkingTreeSummary($path: String!) {\n    gitWorkingTreeSummary(path: $path) {\n      additions\n      deletions\n      files {\n        path\n        status\n        oldPath\n        staged\n        additions\n        deletions\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetGitCommitLog($path: String!, $base: String!) {\n    gitCommitLog(path: $path, base: $base) {\n      hash\n      shortHash\n      message\n      author\n      date\n    }\n  }\n"): (typeof documents)["\n  query GetGitCommitLog($path: String!, $base: String!) {\n    gitCommitLog(path: $path, base: $base) {\n      hash\n      shortHash\n      message\n      author\n      date\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetGitCommitDiff($path: String!, $hash: String!) {\n    gitCommitDiff(path: $path, hash: $hash)\n  }\n"): (typeof documents)["\n  query GetGitCommitDiff($path: String!, $hash: String!) {\n    gitCommitDiff(path: $path, hash: $hash)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetGitBranchDiff($path: String!, $base: String!) {\n    gitBranchDiff(path: $path, base: $base)\n  }\n"): (typeof documents)["\n  query GetGitBranchDiff($path: String!, $base: String!) {\n    gitBranchDiff(path: $path, base: $base)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetGitWorkingTreeDiff($path: String!) {\n    gitWorkingTreeDiff(path: $path)\n  }\n"): (typeof documents)["\n  query GetGitWorkingTreeDiff($path: String!) {\n    gitWorkingTreeDiff(path: $path)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetGitStatusFiles($path: String!) {\n    gitStatusFiles(path: $path) {\n      path\n      status\n      oldPath\n      staged\n      additions\n      deletions\n    }\n  }\n"): (typeof documents)["\n  query GetGitStatusFiles($path: String!) {\n    gitStatusFiles(path: $path) {\n      path\n      status\n      oldPath\n      staged\n      additions\n      deletions\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetGitFileDiff($path: String!, $filePath: String!, $base: String) {\n    gitFileDiff(path: $path, filePath: $filePath, base: $base)\n  }\n"): (typeof documents)["\n  query GetGitFileDiff($path: String!, $filePath: String!, $base: String) {\n    gitFileDiff(path: $path, filePath: $filePath, base: $base)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetGitFileAtRef($path: String!, $filePath: String!, $ref: String) {\n    gitFileAtRef(path: $path, filePath: $filePath, ref: $ref)\n  }\n"): (typeof documents)["\n  query GetGitFileAtRef($path: String!, $filePath: String!, $ref: String) {\n    gitFileAtRef(path: $path, filePath: $filePath, ref: $ref)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetSettings {\n    settings {\n      appearance { theme fontSize compactMode zoomLevel }\n      ai { defaultModel cliPath cliSetupComplete autoCompactPercent }\n      advanced { developerMode focusMonitorEnabled focusMonitorIntervalMs }\n      permissions { activePreset rules { tool behavior entityType } }\n      notifications { mutedSources mutedTypes }\n    }\n  }\n"): (typeof documents)["\n  query GetSettings {\n    settings {\n      appearance { theme fontSize compactMode zoomLevel }\n      ai { defaultModel cliPath cliSetupComplete autoCompactPercent }\n      advanced { developerMode focusMonitorEnabled focusMonitorIntervalMs }\n      permissions { activePreset rules { tool behavior entityType } }\n      notifications { mutedSources mutedTypes }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateAppearanceSettings($input: UpdateAppearanceSettingsInput!) {\n    updateAppearanceSettings(input: $input) {\n      appearance { theme fontSize compactMode zoomLevel }\n      ai { defaultModel cliPath cliSetupComplete autoCompactPercent }\n      advanced { developerMode focusMonitorEnabled focusMonitorIntervalMs }\n      permissions { activePreset rules { tool behavior entityType } }\n      notifications { mutedSources mutedTypes }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateAppearanceSettings($input: UpdateAppearanceSettingsInput!) {\n    updateAppearanceSettings(input: $input) {\n      appearance { theme fontSize compactMode zoomLevel }\n      ai { defaultModel cliPath cliSetupComplete autoCompactPercent }\n      advanced { developerMode focusMonitorEnabled focusMonitorIntervalMs }\n      permissions { activePreset rules { tool behavior entityType } }\n      notifications { mutedSources mutedTypes }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateAiSettings($input: UpdateAiSettingsInput!) {\n    updateAiSettings(input: $input) {\n      appearance { theme fontSize compactMode zoomLevel }\n      ai { defaultModel cliPath cliSetupComplete autoCompactPercent }\n      advanced { developerMode focusMonitorEnabled focusMonitorIntervalMs }\n      permissions { activePreset rules { tool behavior entityType } }\n      notifications { mutedSources mutedTypes }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateAiSettings($input: UpdateAiSettingsInput!) {\n    updateAiSettings(input: $input) {\n      appearance { theme fontSize compactMode zoomLevel }\n      ai { defaultModel cliPath cliSetupComplete autoCompactPercent }\n      advanced { developerMode focusMonitorEnabled focusMonitorIntervalMs }\n      permissions { activePreset rules { tool behavior entityType } }\n      notifications { mutedSources mutedTypes }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateAdvancedSettings($input: UpdateAdvancedSettingsInput!) {\n    updateAdvancedSettings(input: $input) {\n      appearance { theme fontSize compactMode zoomLevel }\n      ai { defaultModel cliPath cliSetupComplete autoCompactPercent }\n      advanced { developerMode focusMonitorEnabled focusMonitorIntervalMs }\n      permissions { activePreset rules { tool behavior entityType } }\n      notifications { mutedSources mutedTypes }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateAdvancedSettings($input: UpdateAdvancedSettingsInput!) {\n    updateAdvancedSettings(input: $input) {\n      appearance { theme fontSize compactMode zoomLevel }\n      ai { defaultModel cliPath cliSetupComplete autoCompactPercent }\n      advanced { developerMode focusMonitorEnabled focusMonitorIntervalMs }\n      permissions { activePreset rules { tool behavior entityType } }\n      notifications { mutedSources mutedTypes }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateSettingsRaw($json: String!) {\n    updateSettingsRaw(json: $json) {\n      appearance { theme fontSize compactMode zoomLevel }\n      ai { defaultModel cliPath cliSetupComplete autoCompactPercent }\n      advanced { developerMode focusMonitorEnabled focusMonitorIntervalMs }\n      permissions { activePreset rules { tool behavior entityType } }\n      notifications { mutedSources mutedTypes }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateSettingsRaw($json: String!) {\n    updateSettingsRaw(json: $json) {\n      appearance { theme fontSize compactMode zoomLevel }\n      ai { defaultModel cliPath cliSetupComplete autoCompactPercent }\n      advanced { developerMode focusMonitorEnabled focusMonitorIntervalMs }\n      permissions { activePreset rules { tool behavior entityType } }\n      notifications { mutedSources mutedTypes }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetNotificationSources {\n    notificationSources {\n      source\n      muted\n      types {\n        id\n        source\n        label\n        description\n        defaultEnabled\n        muted\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetNotificationSources {\n    notificationSources {\n      source\n      muted\n      types {\n        id\n        source\n        label\n        description\n        defaultEnabled\n        muted\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetNotificationSourceMuted($source: String!, $muted: Boolean!) {\n    setNotificationSourceMuted(source: $source, muted: $muted) {\n      notifications { mutedSources mutedTypes }\n    }\n  }\n"): (typeof documents)["\n  mutation SetNotificationSourceMuted($source: String!, $muted: Boolean!) {\n    setNotificationSourceMuted(source: $source, muted: $muted) {\n      notifications { mutedSources mutedTypes }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetNotificationTypeMuted($typeId: String!, $muted: Boolean!) {\n    setNotificationTypeMuted(typeId: $typeId, muted: $muted) {\n      notifications { mutedSources mutedTypes }\n    }\n  }\n"): (typeof documents)["\n  mutation SetNotificationTypeMuted($typeId: String!, $muted: Boolean!) {\n    setNotificationTypeMuted(typeId: $typeId, muted: $muted) {\n      notifications { mutedSources mutedTypes }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ResetNotificationMutes {\n    resetNotificationMutes {\n      notifications { mutedSources mutedTypes }\n    }\n  }\n"): (typeof documents)["\n  mutation ResetNotificationMutes {\n    resetNotificationMutes {\n      notifications { mutedSources mutedTypes }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetRegistries {\n    registries {\n      id\n      name\n      url\n      enabled\n      priority\n      source\n      createdAt\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  query GetRegistries {\n    registries {\n      id\n      name\n      url\n      enabled\n      priority\n      source\n      createdAt\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetRegistry($id: ID!) {\n    registry(id: $id) {\n      id\n      name\n      url\n      enabled\n      priority\n      source\n      createdAt\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  query GetRegistry($id: ID!) {\n    registry(id: $id) {\n      id\n      name\n      url\n      enabled\n      priority\n      source\n      createdAt\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetRegistryQuickActions {\n    registryQuickActions {\n      id\n      label\n      icon\n      description\n      author { name }\n      tags\n      registry\n      options { id label prompt }\n    }\n  }\n"): (typeof documents)["\n  query GetRegistryQuickActions {\n    registryQuickActions {\n      id\n      label\n      icon\n      description\n      author { name }\n      tags\n      registry\n      options { id label prompt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetRegistryQuickActionDefaults {\n    registryQuickActionDefaults\n  }\n"): (typeof documents)["\n  query GetRegistryQuickActionDefaults {\n    registryQuickActionDefaults\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetRegistryVerificationActions {\n    registryVerificationActions {\n      id\n      type\n      label\n      builtinId\n      prompt\n    }\n  }\n"): (typeof documents)["\n  query GetRegistryVerificationActions {\n    registryVerificationActions {\n      id\n      type\n      label\n      builtinId\n      prompt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetRegistryVerificationActionDefaults {\n    registryVerificationActionDefaults {\n      id\n      type\n      label\n      builtinId\n      prompt\n    }\n  }\n"): (typeof documents)["\n  query GetRegistryVerificationActionDefaults {\n    registryVerificationActionDefaults {\n      id\n      type\n      label\n      builtinId\n      prompt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AddRegistry($input: AddRegistryInput!) {\n    addRegistry(input: $input) {\n      registry {\n        id name url enabled priority source createdAt updatedAt\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation AddRegistry($input: AddRegistryInput!) {\n    addRegistry(input: $input) {\n      registry {\n        id name url enabled priority source createdAt updatedAt\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RemoveRegistry($id: ID!) {\n    removeRegistry(id: $id) {\n      registry { id name }\n    }\n  }\n"): (typeof documents)["\n  mutation RemoveRegistry($id: ID!) {\n    removeRegistry(id: $id) {\n      registry { id name }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateRegistry($id: ID!, $input: UpdateRegistryInput!) {\n    updateRegistry(id: $id, input: $input) {\n      registry {\n        id name url enabled priority updatedAt\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateRegistry($id: ID!, $input: UpdateRegistryInput!) {\n    updateRegistry(id: $id, input: $input) {\n      registry {\n        id name url enabled priority updatedAt\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SyncRegistries {\n    syncRegistries {\n      synced\n    }\n  }\n"): (typeof documents)["\n  mutation SyncRegistries {\n    syncRegistries {\n      synced\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetInstalledSkills {\n    installedSkills {\n      id name description version registryVersion\n      source sourceRef registry path\n      icon category tags author\n      enabled pinned installDate lastUsed useCount\n      hasUpdate\n    }\n  }\n"): (typeof documents)["\n  query GetInstalledSkills {\n    installedSkills {\n      id name description version registryVersion\n      source sourceRef registry path\n      icon category tags author\n      enabled pinned installDate lastUsed useCount\n      hasUpdate\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetRegistrySkills {\n    registrySkills {\n      id name description version\n      source repo icon category tags\n      author { name }\n      registry\n    }\n  }\n"): (typeof documents)["\n  query GetRegistrySkills {\n    registrySkills {\n      id name description version\n      source repo icon category tags\n      author { name }\n      registry\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation InstallSkill($skillId: String!, $destination: String) {\n    installSkill(skillId: $skillId, destination: $destination) {\n      skill {\n        id name description version registryVersion\n        source sourceRef registry path\n        icon category tags author\n        enabled pinned installDate lastUsed useCount\n        hasUpdate\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation InstallSkill($skillId: String!, $destination: String) {\n    installSkill(skillId: $skillId, destination: $destination) {\n      skill {\n        id name description version registryVersion\n        source sourceRef registry path\n        icon category tags author\n        enabled pinned installDate lastUsed useCount\n        hasUpdate\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UninstallSkill($skillId: String!) {\n    uninstallSkill(skillId: $skillId) {\n      success\n    }\n  }\n"): (typeof documents)["\n  mutation UninstallSkill($skillId: String!) {\n    uninstallSkill(skillId: $skillId) {\n      success\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateSkill($skillId: String!) {\n    updateSkill(skillId: $skillId) {\n      skill {\n        id name description version registryVersion\n        source sourceRef registry path\n        icon category tags author\n        enabled pinned installDate lastUsed useCount\n        hasUpdate\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateSkill($skillId: String!) {\n    updateSkill(skillId: $skillId) {\n      skill {\n        id name description version registryVersion\n        source sourceRef registry path\n        icon category tags author\n        enabled pinned installDate lastUsed useCount\n        hasUpdate\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ActivateSkill($skillId: String!) {\n    activateSkill(skillId: $skillId) {\n      body\n    }\n  }\n"): (typeof documents)["\n  mutation ActivateSkill($skillId: String!) {\n    activateSkill(skillId: $skillId) {\n      body\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ToggleSkillEnabled($skillId: String!, $enabled: Boolean!) {\n    toggleSkillEnabled(skillId: $skillId, enabled: $enabled) {\n      skill {\n        id enabled\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ToggleSkillEnabled($skillId: String!, $enabled: Boolean!) {\n    toggleSkillEnabled(skillId: $skillId, enabled: $enabled) {\n      skill {\n        id enabled\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ToggleSkillPinned($skillId: String!, $pinned: Boolean!) {\n    toggleSkillPinned(skillId: $skillId, pinned: $pinned) {\n      skill {\n        id pinned\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ToggleSkillPinned($skillId: String!, $pinned: Boolean!) {\n    toggleSkillPinned(skillId: $skillId, pinned: $pinned) {\n      skill {\n        id pinned\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SyncLocalSkills {\n    syncLocalSkills\n  }\n"): (typeof documents)["\n  mutation SyncLocalSkills {\n    syncLocalSkills\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetInstalledPlugins {\n    installedPlugins {\n      id name description version registryVersion\n      source sourceRef registry path\n      icon category tags author\n      enabled installDate\n      hasUpdate\n    }\n  }\n"): (typeof documents)["\n  query GetInstalledPlugins {\n    installedPlugins {\n      id name description version registryVersion\n      source sourceRef registry path\n      icon category tags author\n      enabled installDate\n      hasUpdate\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetRegistryPlugins {\n    registryPlugins {\n      id name description version\n      source repo icon category tags\n      author { name }\n      registry\n      canvases { navSidebar drawer menuBar feed }\n    }\n  }\n"): (typeof documents)["\n  query GetRegistryPlugins {\n    registryPlugins {\n      id name description version\n      source repo icon category tags\n      author { name }\n      registry\n      canvases { navSidebar drawer menuBar feed }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation InstallPlugin($pluginId: String!) {\n    installPlugin(pluginId: $pluginId) {\n      plugin {\n        id name description version registryVersion\n        source sourceRef registry path\n        icon category tags author\n        enabled installDate\n        hasUpdate\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation InstallPlugin($pluginId: String!) {\n    installPlugin(pluginId: $pluginId) {\n      plugin {\n        id name description version registryVersion\n        source sourceRef registry path\n        icon category tags author\n        enabled installDate\n        hasUpdate\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UninstallPlugin($pluginId: String!) {\n    uninstallPlugin(pluginId: $pluginId) {\n      success\n    }\n  }\n"): (typeof documents)["\n  mutation UninstallPlugin($pluginId: String!) {\n    uninstallPlugin(pluginId: $pluginId) {\n      success\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdatePlugin($pluginId: String!) {\n    updatePlugin(pluginId: $pluginId) {\n      plugin {\n        id name description version registryVersion\n        source sourceRef registry path\n        icon category tags author\n        enabled installDate\n        hasUpdate\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdatePlugin($pluginId: String!) {\n    updatePlugin(pluginId: $pluginId) {\n      plugin {\n        id name description version registryVersion\n        source sourceRef registry path\n        icon category tags author\n        enabled installDate\n        hasUpdate\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation TogglePluginEnabled($pluginId: String!, $enabled: Boolean!) {\n    togglePluginEnabled(pluginId: $pluginId, enabled: $enabled) {\n      plugin {\n        id enabled\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation TogglePluginEnabled($pluginId: String!, $enabled: Boolean!) {\n    togglePluginEnabled(pluginId: $pluginId, enabled: $enabled) {\n      plugin {\n        id enabled\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetCommands($categoryFilter: String) {\n    commands(categoryFilter: $categoryFilter) {\n      id\n      category\n      title\n      description\n      keywords\n      disabled\n      disabledReason\n      hasFlow\n      body\n    }\n  }\n"): (typeof documents)["\n  query GetCommands($categoryFilter: String) {\n    commands(categoryFilter: $categoryFilter) {\n      id\n      category\n      title\n      description\n      keywords\n      disabled\n      disabledReason\n      hasFlow\n      body\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ExecuteCommand($commandId: String!, $args: JSON) {\n    executeCommand(commandId: $commandId, args: $args) {\n      success\n      error\n      action {\n        type\n        path\n        message\n        variant\n        text\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ExecuteCommand($commandId: String!, $args: JSON) {\n    executeCommand(commandId: $commandId, args: $args) {\n      success\n      error\n      action {\n        type\n        path\n        message\n        variant\n        text\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RescanClaudeCommands {\n    rescanClaudeCommands\n  }\n"): (typeof documents)["\n  mutation RescanClaudeCommands {\n    rescanClaudeCommands\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdatePermissionsSettings($input: UpdatePermissionsSettingsInput!) {\n    updatePermissionsSettings(input: $input) {\n      appearance { theme fontSize compactMode zoomLevel }\n      ai { defaultModel cliPath cliSetupComplete autoCompactPercent }\n      advanced { developerMode focusMonitorEnabled focusMonitorIntervalMs }\n      permissions { activePreset rules { tool behavior entityType } }\n      notifications { mutedSources mutedTypes }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdatePermissionsSettings($input: UpdatePermissionsSettingsInput!) {\n    updatePermissionsSettings(input: $input) {\n      appearance { theme fontSize compactMode zoomLevel }\n      ai { defaultModel cliPath cliSetupComplete autoCompactPercent }\n      advanced { developerMode focusMonitorEnabled focusMonitorIntervalMs }\n      permissions { activePreset rules { tool behavior entityType } }\n      notifications { mutedSources mutedTypes }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetPermissionPolicy($scopeType: PermissionScopeType!, $scopeId: String!) {\n    permissionPolicy(scopeType: $scopeType, scopeId: $scopeId) {\n      id\n      scopeType\n      scopeId\n      rules { tool behavior entityType }\n      templateId\n      createdAt\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  query GetPermissionPolicy($scopeType: PermissionScopeType!, $scopeId: String!) {\n    permissionPolicy(scopeType: $scopeType, scopeId: $scopeId) {\n      id\n      scopeType\n      scopeId\n      rules { tool behavior entityType }\n      templateId\n      createdAt\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetPermissionPolicy($scopeType: PermissionScopeType!, $scopeId: String!, $rules: [PermissionRuleConfigInput!]!) {\n    setPermissionPolicy(scopeType: $scopeType, scopeId: $scopeId, rules: $rules) {\n      id\n      scopeType\n      scopeId\n      rules { tool behavior entityType }\n      templateId\n    }\n  }\n"): (typeof documents)["\n  mutation SetPermissionPolicy($scopeType: PermissionScopeType!, $scopeId: String!, $rules: [PermissionRuleConfigInput!]!) {\n    setPermissionPolicy(scopeType: $scopeType, scopeId: $scopeId, rules: $rules) {\n      id\n      scopeType\n      scopeId\n      rules { tool behavior entityType }\n      templateId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeletePermissionPolicy($scopeType: PermissionScopeType!, $scopeId: String!) {\n    deletePermissionPolicy(scopeType: $scopeType, scopeId: $scopeId)\n  }\n"): (typeof documents)["\n  mutation DeletePermissionPolicy($scopeType: PermissionScopeType!, $scopeId: String!) {\n    deletePermissionPolicy(scopeType: $scopeType, scopeId: $scopeId)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetResolvedPermissions($workstreamId: ID!) {\n    resolvedPermissions(workstreamId: $workstreamId) {\n      tool\n      behavior\n      entityType\n    }\n  }\n"): (typeof documents)["\n  query GetResolvedPermissions($workstreamId: ID!) {\n    resolvedPermissions(workstreamId: $workstreamId) {\n      tool\n      behavior\n      entityType\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetResolvedParentPermissions($scopeType: PermissionScopeType!, $scopeId: String!) {\n    resolvedParentPermissions(scopeType: $scopeType, scopeId: $scopeId) {\n      tool\n      behavior\n      entityType\n    }\n  }\n"): (typeof documents)["\n  query GetResolvedParentPermissions($scopeType: PermissionScopeType!, $scopeId: String!) {\n    resolvedParentPermissions(scopeType: $scopeType, scopeId: $scopeId) {\n      tool\n      behavior\n      entityType\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetPermissionTemplates {\n    permissionTemplates {\n      id\n      name\n      description\n      rules { tool behavior entityType }\n      createdAt\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  query GetPermissionTemplates {\n    permissionTemplates {\n      id\n      name\n      description\n      rules { tool behavior entityType }\n      createdAt\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetPermissionTemplate($id: ID!) {\n    permissionTemplate(id: $id) {\n      id\n      name\n      description\n      rules { tool behavior entityType }\n      createdAt\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  query GetPermissionTemplate($id: ID!) {\n    permissionTemplate(id: $id) {\n      id\n      name\n      description\n      rules { tool behavior entityType }\n      createdAt\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreatePermissionTemplate($name: String!, $description: String, $rules: [PermissionRuleConfigInput!]!) {\n    createPermissionTemplate(name: $name, description: $description, rules: $rules) {\n      id\n      name\n      description\n      rules { tool behavior entityType }\n      createdAt\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  mutation CreatePermissionTemplate($name: String!, $description: String, $rules: [PermissionRuleConfigInput!]!) {\n    createPermissionTemplate(name: $name, description: $description, rules: $rules) {\n      id\n      name\n      description\n      rules { tool behavior entityType }\n      createdAt\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdatePermissionTemplate($id: ID!, $name: String, $description: String, $rules: [PermissionRuleConfigInput!]) {\n    updatePermissionTemplate(id: $id, name: $name, description: $description, rules: $rules) {\n      id\n      name\n      description\n      rules { tool behavior entityType }\n      createdAt\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  mutation UpdatePermissionTemplate($id: ID!, $name: String, $description: String, $rules: [PermissionRuleConfigInput!]) {\n    updatePermissionTemplate(id: $id, name: $name, description: $description, rules: $rules) {\n      id\n      name\n      description\n      rules { tool behavior entityType }\n      createdAt\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeletePermissionTemplate($id: ID!) {\n    deletePermissionTemplate(id: $id)\n  }\n"): (typeof documents)["\n  mutation DeletePermissionTemplate($id: ID!) {\n    deletePermissionTemplate(id: $id)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ApplyPermissionTemplate($templateId: ID!, $scopeType: PermissionScopeType!, $scopeId: String!) {\n    applyPermissionTemplate(templateId: $templateId, scopeType: $scopeType, scopeId: $scopeId)\n  }\n"): (typeof documents)["\n  mutation ApplyPermissionTemplate($templateId: ID!, $scopeType: PermissionScopeType!, $scopeId: String!) {\n    applyPermissionTemplate(templateId: $templateId, scopeType: $scopeType, scopeId: $scopeId)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetTagsByProject($projectId: ID!) {\n    tagsByProject(projectId: $projectId) {\n      name\n      instructions\n      color\n      maxDepth\n      spawnWorkstream\n      worktreeMode\n      dependsOn\n    }\n  }\n"): (typeof documents)["\n  query GetTagsByProject($projectId: ID!) {\n    tagsByProject(projectId: $projectId) {\n      name\n      instructions\n      color\n      maxDepth\n      spawnWorkstream\n      worktreeMode\n      dependsOn\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetTagByName($projectId: ID!, $name: String!) {\n    tagByName(projectId: $projectId, name: $name) {\n      name\n      instructions\n      color\n      maxDepth\n      spawnWorkstream\n      worktreeMode\n      dependsOn\n    }\n  }\n"): (typeof documents)["\n  query GetTagByName($projectId: ID!, $name: String!) {\n    tagByName(projectId: $projectId, name: $name) {\n      name\n      instructions\n      color\n      maxDepth\n      spawnWorkstream\n      worktreeMode\n      dependsOn\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetWorkstreamTags($workstreamId: ID!) {\n    workstreamTags(workstreamId: $workstreamId) {\n      id\n      workstreamId\n      tagName\n      tagInstructions\n      tagColor\n      tagMaxDepth\n      tagSpawnWorkstream\n      tagWorktreeMode\n      tagDependsOn\n      status\n      appliedAt\n      startedAt\n      completedAt\n      error\n      appliedBy\n      depth\n      delegatedWorkstreamId\n    }\n  }\n"): (typeof documents)["\n  query GetWorkstreamTags($workstreamId: ID!) {\n    workstreamTags(workstreamId: $workstreamId) {\n      id\n      workstreamId\n      tagName\n      tagInstructions\n      tagColor\n      tagMaxDepth\n      tagSpawnWorkstream\n      tagWorktreeMode\n      tagDependsOn\n      status\n      appliedAt\n      startedAt\n      completedAt\n      error\n      appliedBy\n      depth\n      delegatedWorkstreamId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateTag($input: CreateTagInput!) {\n    createTag(input: $input) {\n      tag {\n        name\n        instructions\n        color\n        maxDepth\n        spawnWorkstream\n        worktreeMode\n        dependsOn\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateTag($input: CreateTagInput!) {\n    createTag(input: $input) {\n      tag {\n        name\n        instructions\n        color\n        maxDepth\n        spawnWorkstream\n        worktreeMode\n        dependsOn\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateTag($projectId: ID!, $tagName: String!, $input: UpdateTagInput!) {\n    updateTag(projectId: $projectId, tagName: $tagName, input: $input) {\n      tag {\n        name\n        instructions\n        color\n        maxDepth\n        spawnWorkstream\n        worktreeMode\n        dependsOn\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateTag($projectId: ID!, $tagName: String!, $input: UpdateTagInput!) {\n    updateTag(projectId: $projectId, tagName: $tagName, input: $input) {\n      tag {\n        name\n        instructions\n        color\n        maxDepth\n        spawnWorkstream\n        worktreeMode\n        dependsOn\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteTag($projectId: ID!, $tagName: String!) {\n    deleteTag(projectId: $projectId, tagName: $tagName) {\n      tag {\n        name\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteTag($projectId: ID!, $tagName: String!) {\n    deleteTag(projectId: $projectId, tagName: $tagName) {\n      tag {\n        name\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ApplyTagToWorkstream($workstreamId: ID!, $tagName: String!) {\n    applyTagToWorkstream(workstreamId: $workstreamId, tagName: $tagName) {\n      workstreamTag {\n        id\n        workstreamId\n        tagName\n        tagColor\n        status\n        appliedAt\n        appliedBy\n        depth\n      }\n      pipelineRunId\n    }\n  }\n"): (typeof documents)["\n  mutation ApplyTagToWorkstream($workstreamId: ID!, $tagName: String!) {\n    applyTagToWorkstream(workstreamId: $workstreamId, tagName: $tagName) {\n      workstreamTag {\n        id\n        workstreamId\n        tagName\n        tagColor\n        status\n        appliedAt\n        appliedBy\n        depth\n      }\n      pipelineRunId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RemoveTagFromWorkstream($workstreamId: ID!, $tagName: String!) {\n    removeTagFromWorkstream(workstreamId: $workstreamId, tagName: $tagName) {\n      success\n    }\n  }\n"): (typeof documents)["\n  mutation RemoveTagFromWorkstream($workstreamId: ID!, $tagName: String!) {\n    removeTagFromWorkstream(workstreamId: $workstreamId, tagName: $tagName) {\n      success\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetContentProfiles {\n    contentProfiles {\n      name\n      directory\n      isDefault\n      isActive\n      isFork\n      metadata {\n        displayName\n        description\n        author {\n          name\n          url\n        }\n        icon\n        tags\n        sourceUrl\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetContentProfiles {\n    contentProfiles {\n      name\n      directory\n      isDefault\n      isActive\n      isFork\n      metadata {\n        displayName\n        description\n        author {\n          name\n          url\n        }\n        icon\n        tags\n        sourceUrl\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetActiveContentProfile {\n    activeContentProfile {\n      name\n      directory\n      isDefault\n      isActive\n      isFork\n      metadata {\n        displayName\n        description\n        icon\n        tags\n        sourceUrl\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetActiveContentProfile {\n    activeContentProfile {\n      name\n      directory\n      isDefault\n      isActive\n      isFork\n      metadata {\n        displayName\n        description\n        icon\n        tags\n        sourceUrl\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ForkContentProfile($gitUrl: String!, $name: String) {\n    forkContentProfile(gitUrl: $gitUrl, name: $name) {\n      name\n      directory\n      isDefault\n      isActive\n      isFork\n      metadata {\n        displayName\n        description\n        icon\n        sourceUrl\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ForkContentProfile($gitUrl: String!, $name: String) {\n    forkContentProfile(gitUrl: $gitUrl, name: $name) {\n      name\n      directory\n      isDefault\n      isActive\n      isFork\n      metadata {\n        displayName\n        description\n        icon\n        sourceUrl\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SwitchContentProfile($name: String!) {\n    switchContentProfile(name: $name)\n  }\n"): (typeof documents)["\n  mutation SwitchContentProfile($name: String!) {\n    switchContentProfile(name: $name)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteContentProfile($name: String!) {\n    deleteContentProfile(name: $name)\n  }\n"): (typeof documents)["\n  mutation DeleteContentProfile($name: String!) {\n    deleteContentProfile(name: $name)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetTask($id: ID!) {\n    task(id: $id) {\n      id\n      projectId\n      identifier\n      title\n      description\n      status\n      priority\n      assigneeType\n      assigneeWorkstreamId\n      dueDate\n      parentId\n      links\n      createdAt\n      updatedAt\n      labels {\n        id\n        name\n        color\n      }\n      subtasks {\n        id\n        identifier\n        title\n        status\n        priority\n      }\n      parent {\n        id\n        identifier\n        title\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetTask($id: ID!) {\n    task(id: $id) {\n      id\n      projectId\n      identifier\n      title\n      description\n      status\n      priority\n      assigneeType\n      assigneeWorkstreamId\n      dueDate\n      parentId\n      links\n      createdAt\n      updatedAt\n      labels {\n        id\n        name\n        color\n      }\n      subtasks {\n        id\n        identifier\n        title\n        status\n        priority\n      }\n      parent {\n        id\n        identifier\n        title\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetTasks($projectId: ID!, $status: TaskStatus, $priority: TaskPriority, $assigneeType: TaskAssigneeType, $labelId: String, $parentId: String, $query: String, $limit: Int) {\n    tasks(projectId: $projectId, status: $status, priority: $priority, assigneeType: $assigneeType, labelId: $labelId, parentId: $parentId, query: $query, limit: $limit) {\n      id\n      projectId\n      identifier\n      title\n      description\n      status\n      priority\n      assigneeType\n      assigneeWorkstreamId\n      dueDate\n      parentId\n      links\n      createdAt\n      updatedAt\n      labels {\n        id\n        name\n        color\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetTasks($projectId: ID!, $status: TaskStatus, $priority: TaskPriority, $assigneeType: TaskAssigneeType, $labelId: String, $parentId: String, $query: String, $limit: Int) {\n    tasks(projectId: $projectId, status: $status, priority: $priority, assigneeType: $assigneeType, labelId: $labelId, parentId: $parentId, query: $query, limit: $limit) {\n      id\n      projectId\n      identifier\n      title\n      description\n      status\n      priority\n      assigneeType\n      assigneeWorkstreamId\n      dueDate\n      parentId\n      links\n      createdAt\n      updatedAt\n      labels {\n        id\n        name\n        color\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetTaskLabels($projectId: ID!) {\n    taskLabels(projectId: $projectId) {\n      id\n      projectId\n      name\n      color\n      createdAt\n    }\n  }\n"): (typeof documents)["\n  query GetTaskLabels($projectId: ID!) {\n    taskLabels(projectId: $projectId) {\n      id\n      projectId\n      name\n      color\n      createdAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateTask($input: CreateTaskInput!) {\n    createTask(input: $input) {\n      task {\n        id\n        projectId\n        identifier\n        title\n        status\n        priority\n        createdAt\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateTask($input: CreateTaskInput!) {\n    createTask(input: $input) {\n      task {\n        id\n        projectId\n        identifier\n        title\n        status\n        priority\n        createdAt\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateTask($id: ID!, $input: UpdateTaskInput!) {\n    updateTask(id: $id, input: $input) {\n      task {\n        id\n        projectId\n        identifier\n        title\n        description\n        status\n        priority\n        assigneeType\n        assigneeWorkstreamId\n        dueDate\n        parentId\n        links\n        createdAt\n        updatedAt\n        labels {\n          id\n          name\n          color\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateTask($id: ID!, $input: UpdateTaskInput!) {\n    updateTask(id: $id, input: $input) {\n      task {\n        id\n        projectId\n        identifier\n        title\n        description\n        status\n        priority\n        assigneeType\n        assigneeWorkstreamId\n        dueDate\n        parentId\n        links\n        createdAt\n        updatedAt\n        labels {\n          id\n          name\n          color\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteTask($id: ID!) {\n    deleteTask(id: $id) {\n      success\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteTask($id: ID!) {\n    deleteTask(id: $id) {\n      success\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateTaskLabel($projectId: ID!, $name: String!, $color: String!) {\n    createTaskLabel(projectId: $projectId, name: $name, color: $color) {\n      label {\n        id\n        projectId\n        name\n        color\n        createdAt\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateTaskLabel($projectId: ID!, $name: String!, $color: String!) {\n    createTaskLabel(projectId: $projectId, name: $name, color: $color) {\n      label {\n        id\n        projectId\n        name\n        color\n        createdAt\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateTaskLabel($id: ID!, $name: String, $color: String) {\n    updateTaskLabel(id: $id, name: $name, color: $color) {\n      label {\n        id\n        projectId\n        name\n        color\n        createdAt\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateTaskLabel($id: ID!, $name: String, $color: String) {\n    updateTaskLabel(id: $id, name: $name, color: $color) {\n      label {\n        id\n        projectId\n        name\n        color\n        createdAt\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteTaskLabel($id: ID!) {\n    deleteTaskLabel(id: $id) {\n      success\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteTaskLabel($id: ID!) {\n    deleteTaskLabel(id: $id) {\n      success\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetInboxItems($includeArchived: Boolean, $includeRead: Boolean, $limit: Int, $offset: Int) {\n    inboxItems(includeArchived: $includeArchived, includeRead: $includeRead, limit: $limit, offset: $offset) {\n      id\n      title\n      description\n      icon\n      source\n      actions {\n        id\n        label\n        payload\n      }\n      entityUri\n      ctaLabel\n      read\n      archived\n      createdAt\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  query GetInboxItems($includeArchived: Boolean, $includeRead: Boolean, $limit: Int, $offset: Int) {\n    inboxItems(includeArchived: $includeArchived, includeRead: $includeRead, limit: $limit, offset: $offset) {\n      id\n      title\n      description\n      icon\n      source\n      actions {\n        id\n        label\n        payload\n      }\n      entityUri\n      ctaLabel\n      read\n      archived\n      createdAt\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetInboxUnreadCount {\n    inboxUnreadCount\n  }\n"): (typeof documents)["\n  query GetInboxUnreadCount {\n    inboxUnreadCount\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation PushInboxItem($input: PushInboxItemInput!) {\n    pushInboxItem(input: $input) {\n      inboxItem {\n        id\n        title\n        description\n        icon\n        source\n        actions {\n          id\n          label\n          payload\n        }\n        entityUri\n        ctaLabel\n        read\n        archived\n        createdAt\n        updatedAt\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation PushInboxItem($input: PushInboxItemInput!) {\n    pushInboxItem(input: $input) {\n      inboxItem {\n        id\n        title\n        description\n        icon\n        source\n        actions {\n          id\n          label\n          payload\n        }\n        entityUri\n        ctaLabel\n        read\n        archived\n        createdAt\n        updatedAt\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation MarkInboxItemRead($id: ID!) {\n    markInboxItemRead(id: $id) {\n      inboxItem {\n        id\n        read\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation MarkInboxItemRead($id: ID!) {\n    markInboxItemRead(id: $id) {\n      inboxItem {\n        id\n        read\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation MarkAllInboxItemsRead {\n    markAllInboxItemsRead {\n      count\n    }\n  }\n"): (typeof documents)["\n  mutation MarkAllInboxItemsRead {\n    markAllInboxItemsRead {\n      count\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ArchiveInboxItem($id: ID!) {\n    archiveInboxItem(id: $id) {\n      inboxItem {\n        id\n        archived\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ArchiveInboxItem($id: ID!) {\n    archiveInboxItem(id: $id) {\n      inboxItem {\n        id\n        archived\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteInboxItem($id: ID!) {\n    deleteInboxItem(id: $id) {\n      success\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteInboxItem($id: ID!) {\n    deleteInboxItem(id: $id) {\n      success\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ExecuteInboxAction($actionId: String!, $payload: JSON) {\n    executeInboxAction(actionId: $actionId, payload: $payload) {\n      success\n    }\n  }\n"): (typeof documents)["\n  mutation ExecuteInboxAction($actionId: String!, $payload: JSON) {\n    executeInboxAction(actionId: $actionId, payload: $payload) {\n      success\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetRegisteredEvents {\n    registeredEvents {\n      qualifiedName\n      localName\n      description\n      ownerPluginId\n      listenerCount\n      payloadSchema\n    }\n  }\n"): (typeof documents)["\n  query GetRegisteredEvents {\n    registeredEvents {\n      qualifiedName\n      localName\n      description\n      ownerPluginId\n      listenerCount\n      payloadSchema\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetEntityToolEntries {\n    entityToolEntries {\n      uri\n      addedAt\n    }\n  }\n"): (typeof documents)["\n  query GetEntityToolEntries {\n    entityToolEntries {\n      uri\n      addedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AddEntityToolEntry($uri: String!) {\n    addEntityToolEntry(uri: $uri) {\n      entry {\n        uri\n        addedAt\n      }\n      alreadyExists\n    }\n  }\n"): (typeof documents)["\n  mutation AddEntityToolEntry($uri: String!) {\n    addEntityToolEntry(uri: $uri) {\n      entry {\n        uri\n        addedAt\n      }\n      alreadyExists\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RemoveEntityToolEntry($uri: String!) {\n    removeEntityToolEntry(uri: $uri) {\n      success\n    }\n  }\n"): (typeof documents)["\n  mutation RemoveEntityToolEntry($uri: String!) {\n    removeEntityToolEntry(uri: $uri) {\n      success\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;