export type {
  CanonLock,
  StoryMetadata,
  CharacterDefinition,
  LocationDefinition,
  RepoModel,
  GitHubTreeEntry,
  GitHubRepoInput,
  CheckId,
  CheckResult,
  StoryCheckReport,
  RepoCheckReport,
  CanonConfig,
} from "./types.js"

export {
  checkCharacters,
  checkLocations,
  checkTimeline,
  checkContinuity,
  checkCanonVersion,
  checkContributor,
  checkMetadataSchema,
  validateStory,
  validateRepo,
} from "./validate.js"

export {
  METADATA_VERSION,
  LOCK_VERSION,
  REPORT_VERSION,
  CHECK_IDS,
  SchemaVersionError,
  parseMetadata,
  parseCanonLock,
} from "./contract.js"
