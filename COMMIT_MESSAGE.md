fix: Enable webhook relay in production builds and add test feature

Major fixes for production app webhook handling:
- Restructured main process to check --webhook argument before Electron init
- Fixed webhook relay to properly forward events and exit
- Updated data storage to use app.getPath('userData') in production
- Fixed development mode detection using app.isPackaged
- Fixed icon path resolution for packaged apps

New features:
- Added webhook connectivity test component
- Added test endpoint to webhook server
- Integrated test UI into Hooks Config page
- Added troubleshooting tips and visual feedback

Other improvements:
- Removed hardcoded development paths
- Updated default webhook paths based on environment
- Created test script for debugging webhook functionality
- Added production setup documentation

This enables the packaged .app to work both as a standalone GUI application
and as a webhook relay for Claude Code hooks.

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>