export { CodeEditor, type CodeEditorProps } from './CodeEditor';
export {
  parseBlankTemplate,
  guidedBlanksExtension,
  guidedBlanksField,
  setGuidedBlanksEffect,
  focusNextGuidedBlank,
  type BlankRange,
  type BlankSpan,
  type ParsedBlankTemplate,
} from './blankWidgets';
export {
  lineHighlightExtension,
  setExecutingLineEffect,
  setLoopCountersEffect,
  setErrorLineEffect,
  setHintLinesEffect,
  scrollLineIntoView,
  type LoopCounterBadge,
  type ErrorLineMarker,
} from './lineHighlight';
export {
  capabilityAutocompleteExtension,
  createCapabilityCompletionSource,
  filterAllowedApiSpecs,
  getUnlockedSnippetChips,
  type ApiCompletionSpec,
  type SnippetChip,
} from './autocomplete';
