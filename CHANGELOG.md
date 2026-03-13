## 0.2.2 (2026-03-13)
### Workflow Orchestration
- Integrate OCR, BDA, Transcribe, and WebCrawler preprocessing into Step Functions state machine with polling loops for async job
tracking
- Add real-time progress visibility for all preprocessing steps through WebSocket notifications
- Add English comments to all Step Functions states describing purpose and branching logic

### Analysis Optimization
- Improve analysis prompt to reduce redundant processing
- Exclude Excel (.xlsx) and CSV files from AI analysis pipeline

### Bug Fixes
- Fix webcrawler branch completing immediately without waiting for agent to finish (add DDB polling loop)
- Fix transcribe results not being merged into segments (check use_transcribe flag instead of missing preprocess_check.status)
- Fix reanalysis not updating language in DynamoDB workflow data
- Fix single tilde (~) being rendered as strikethrough in markdown across all components
- Fix shell redirect issue in Lambda layer build causing junk file creation

## 0.2.1 (2026-03-10)

Infrastructure updates for large-scale document processing.

# Changelog

## 0.2.0 (2026-03-01)

Initial release of IDP Pipeline v2.
