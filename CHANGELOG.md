
# ChangeLog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/).
and this project adheres to [Semantic Versioning](http://semver.org/).

## [0.8.1] - 2024-09-23

### Changed

- decodeAtr() fixes and additional checks

## [0.8.0] - 2024-09-22

### Added

- ATR decoding `Utils.decodeAtr()`
- "values" exports for GlobalPlatform and "Iso7816" containing respective commonly used values as, for example, command apdu INS byte values
- INS values for Iso7816-defined commands (according to Iso7816-4(2014) specifications)

### Changed

- Gathered GlobalPlatform and Iso7816 stuff under respective exported namespaces:
    - `Iso7816.values`
    - `Iso7816.commands`
    - `GP.values`
    - `GP.commands`
    - `GP.SCP02`
    - `GP.SCP11`

## [0.7.0] - 2024-09-17

### Added
- Initial package release