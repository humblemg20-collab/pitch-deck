$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$workspace = Join-Path ([System.IO.Path]::GetTempPath()) ('ag24_compare_test_' + [guid]::NewGuid().ToString('N'))
$repo = Join-Path $workspace 'repo'
$live = Join-Path $workspace 'live'
$zipPath = Join-Path $workspace 'backup.zip'
$scriptId = 'TEST_SCRIPT_ID_ABCDEFGHIJKLMNOP'
$tool = Join-Path (Split-Path -Parent $PSScriptRoot) 'scripts/compare-apps-script.ps1'

try {
  New-Item -ItemType Directory -Force -Path $repo, $live | Out-Null
  $apiOld = "function apiBootstrap() {} function apiCreateProject() {} function apiSaveSection() {} function generateStandardPresentation() {} function buildStandardDeckContent() {}"
  $apiNew = $apiOld + " function apiNewFeature() {}"
  [System.IO.File]::WriteAllText((Join-Path $live 'Api.gs'), $apiOld)
  [System.IO.File]::WriteAllText((Join-Path $live 'Legacy.gs'), "function legacyKeepMe() {}")
  [System.IO.File]::WriteAllText((Join-Path $live 'App.html'), '<div>UI</div>')
  [System.IO.File]::WriteAllText((Join-Path $live 'appsscript.json'), '{"runtimeVersion":"V8"}')
  [System.IO.File]::WriteAllText((Join-Path $live '.clasp.json'), ('{"scriptId":"' + $scriptId + '"}'))

  [System.IO.File]::WriteAllText((Join-Path $repo 'Api.js'), $apiNew)
  [System.IO.File]::WriteAllText((Join-Path $repo 'App.html'), '<div>UI</div>')
  [System.IO.File]::WriteAllText((Join-Path $repo 'New.js'), 'function newModule() {}')
  [System.IO.File]::WriteAllText((Join-Path $repo 'appsscript.json'), '{"runtimeVersion":"V8"}')

  & git -C $repo init -b feature/asset-engine-v1-20261008 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'TEST_GIT_INIT_FAILED' }
  & git -C $repo config user.email ci@example.invalid
  & git -C $repo config user.name 'AG24 CI'
  & git -C $repo add .
  & git -C $repo commit -m fixture | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'TEST_GIT_COMMIT_FAILED' }

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [System.IO.Compression.ZipFile]::CreateFromDirectory($live, $zipPath)
  $sha = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash

  $options = @{
    BackupZip = $zipPath
    ExpectedBackupSha256 = $sha
    ExpectedScriptId = $scriptId
    RepositoryRoot = $repo
  }
  & $tool @options
  if (-not $?) { throw 'COMPARISON_ENGINE_FAILED' }

  $reportFile = Get-ChildItem -LiteralPath $workspace -Filter 'AG24_COMPARE_*.csv' |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $reportFile) { throw 'REPORT_MISSING' }
  $rows = @(Import-Csv -LiteralPath $reportFile.FullName)
  $statuses = @{}
  foreach ($row in $rows) { $statuses[$row.Identity] = $row.Status }

  if ($statuses['SERVER:api'] -ne 'MODIFIED') { throw 'MODIFIED_NOT_FOUND' }
  if ($statuses['SERVER:legacy'] -ne 'LIVE_ONLY') { throw 'LIVE_ONLY_NOT_PROTECTED' }
  if ($statuses['SERVER:new'] -ne 'NEW_IN_GITHUB') { throw 'NEW_NOT_FOUND' }
  if ($statuses['HTML:app'] -ne 'UNCHANGED') { throw 'HTML_FALSE_DIFF' }
  if ($statuses['MANIFEST:appsscript'] -ne 'UNCHANGED') { throw 'MANIFEST_FALSE_DIFF' }

  $tamperRejected = $false
  try {
    $options.ExpectedBackupSha256 = '0' * 64
    & $tool @options | Out-Null
  } catch {
    $tamperRejected = $_.Exception.Message -match 'BACKUP_SHA256_MISMATCH'
  }
  if (-not $tamperRejected) { throw 'BACKUP_INTEGRITY_NOT_ENFORCED' }

  $wrongIdRejected = $false
  try {
    $options.ExpectedBackupSha256 = $sha
    $options.ExpectedScriptId = 'INVALID_SCRIPT_ID_ABCDEFGHIJKLMN'
    & $tool @options | Out-Null
  } catch {
    $wrongIdRejected = $_.Exception.Message -match 'WRONG_SCRIPT_ID_IN_BACKUP'
  }
  if (-not $wrongIdRejected) { throw 'SCRIPT_ID_NOT_ENFORCED' }

  Write-Host 'COMPARE_ENGINE_TESTS=PASS'
  Write-Host 'SOURCE_CLASSIFICATION=PASS'
  Write-Host 'BACKUP_HASH_GUARD=PASS'
  Write-Host 'SCRIPT_ID_GUARD=PASS'
  Write-Host 'REMOTE_WRITES=NONE'
}
finally {
  if (Test-Path -LiteralPath $workspace) {
    Remove-Item -LiteralPath $workspace -Recurse -Force
  }
}
