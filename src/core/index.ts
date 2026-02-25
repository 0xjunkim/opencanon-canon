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
  // v1.3 additive types
  StoryMetadata_v1_3,
  ParsedMetadataResult,
  RepoModelAny,
  CheckIdV3,
  CheckResultV3,
  StoryCheckReportV3,
  RepoCheckReportV3,
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
  // v1.3 additive
  checkMetadataSchema_v1_3,
  checkDerivedFrom,
  validateStory_v1_3,
  validateRepoAny,
} from "./validate.js"

export {
  METADATA_VERSION,
  LOCK_VERSION,
  REPORT_VERSION,
  CHECK_IDS,
  SchemaVersionError,
  parseMetadata,
  parseCanonLock,
  assertReportVersion,
  // v1.3 additive
  METADATA_VERSION_V13,
  REPORT_VERSION_V3,
  CHECK_IDS_V13,
  parseMetadata_v1_3,
  parseMetadataAny,
  assertReportVersion_v3,
} from "./contract.js"

export {
  hasExcessiveCombining,
  hasProhibitedCodepoints,
} from "./sanitize.js"
