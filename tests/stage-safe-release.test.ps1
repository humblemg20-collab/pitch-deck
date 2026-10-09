$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$workspace=Join-Path ([IO.Path]::GetTempPath()) ('ag24_stage_' + [guid]::NewGuid().ToString('N'))
$repo=Join-Path $workspace 'repo'
$live=Join-Path $workspace 'live'
$zip=Join-Path $workspace 'backup.zip'
$tool=Join-Path (Split-Path -Parent $PSScriptRoot) 'scripts/stage-safe-release.ps1'
$id='TEST_SCRIPT_ID_ABCDEFGHIJKLMNOP'
$branch='feature/asset-engine-v1-20261008'
try {
  New-Item -ItemType Directory -Force -Path $repo,$live | Out-Null
  & git -C $repo init -b main | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'GIT_INIT_FAILED' }
  & git -C $repo config user.email ag24-ci@example.invalid
  & git -C $repo config user.name 'AG24 CI'
  $original=@'
function basic() {
  return "original";
}
function stable() {
  return "original";
}
'@
  $feature=@'
function basic() {
  return "feature";
}
function stable() {
  return "original";
}
'@
  $liveChange=@'
function basic() {
  return "original";
}
function stable() {
  return "live";
}
'@
  [IO.File]::WriteAllText((Join-Path $repo 'Api.js'),$original)
  [IO.File]::WriteAllText((Join-Path $repo 'appsscript.json'),'{"runtimeVersion":"V8","dependencies":{}}')
  & git -C $repo add . | Out-Null
  & git -C $repo commit -m base | Out-Null
  if ($LASTEXITCODE -ne 0) {throw 'BASE_COMMIT_FAILED'}
  $base=(& git -C $repo rev-parse HEAD | Out-String).Trim()
  & git -C $repo checkout -b $branch | Out-Null
  [IO.File]::WriteAllText((Join-Path $repo 'Api.js'),$feature)
  [IO.File]::WriteAllText((Join-Path $repo 'New.js'),'function brandNew() {}')
  [IO.File]::WriteAllText((Join-Path $repo 'appsscript.json'),'{"runtimeVersion":"V8","dependencies":{"services":[]}}')
  & git -C $repo add . | Out-Null
  & git -C $repo commit -m feature | Out-Null
  if ($LASTEXITCODE -ne 0) {throw 'FEATURE_COMMIT_FAILED'}
  $head=(& git -C $repo rev-parse HEAD | Out-String).Trim()

  [IO.File]::WriteAllText((Join-Path $live 'Api.gs'),$liveChange)
  [IO.File]::WriteAllText((Join-Path $live 'Legacy.gs'),'function legacyKeepMe() {}')
  [IO.File]::WriteAllText((Join-Path $live 'PaymentApi.gs'),'function apiVerifyPitchAccess() {}')
  [IO.File]::WriteAllText((Join-Path $live 'App_Payment_Patch.html'),'<p>Legacy payment patch</p>')
  [IO.File]::WriteAllText((Join-Path $live 'appsscript.json'),'{"runtimeVersion":"V8","oauthScopes":["https://www.googleapis.com/auth/drive"]}')
  [IO.File]::WriteAllText((Join-Path $live '.clasp.json'),('{"scriptId":"' + $id + '"}'))
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [IO.Compression.ZipFile]::CreateFromDirectory($live,$zip)
  $hash=(Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash
  $args=@{
    BackupZip=$zip
    ExpectedBackupSha256=$hash
    ExpectedScriptId=$id
    ExpectedCommit=$head
    BaseCommit=$base
    RepositoryRoot=$repo
    ExpectedBranch=$branch
    OutputRoot=(Join-Path $workspace 'stages')
  }
  try {
    $output=& $tool @args
  } catch {
    Write-Host ('STAGING_EXCEPTION=' + $_.Exception.Message)
    Write-Host ('STAGING_POSITION=' + $_.InvocationInfo.PositionMessage)
    Write-Host ('STAGING_STACK=' + $_.ScriptStackTrace)
    throw
  }
  if (-not $?) {throw 'STAGING_SCRIPT_FAILED'}
  $releaseFolder=Get-ChildItem -LiteralPath $args.OutputRoot -Directory | Sort-Object Name -Descending | Select-Object -First 1
  $releaseRoot=if ($releaseFolder) {$releaseFolder.FullName} else {''}
  if (-not $releaseRoot) {throw 'MISSING_RELEASE_ROOT'}
  $manifest=Get-Content (Join-Path $releaseRoot 'manifest.json') -Raw | ConvertFrom-Json
  $payload=Join-Path $releaseRoot 'payload'
  $merge=[IO.File]::ReadAllText((Join-Path $payload 'Api.gs'))
  if ($merge -notmatch '"feature"' -or $merge -notmatch '"live"') {
    throw 'THREE_WAY_MERGE_LOST_CHANGES'
  }
  if (-not (Test-Path (Join-Path $payload 'Legacy.gs'))) {
    throw 'LIVE_ONLY_FILE_LOST'
  }
  if (-not (Test-Path (Join-Path $payload 'New.js'))) {
    throw 'NEW_FILE_NOT_STAGED'
  }
  if ((Test-Path (Join-Path $payload 'App_Payment_Patch.html')) -or
      (Test-Path (Join-Path $payload 'PaymentApi.gs'))) {
    throw 'RETIRED_PAYMENT_CODE_STAGED'
  }
  $manifestText=[IO.File]::ReadAllText((Join-Path $payload 'appsscript.json'))
  if ($manifestText -notmatch 'oauthScopes' -or $manifestText -match 'services') {
    throw 'LIVE_MANIFEST_NOT_PRESERVED'
  }
  if ($manifest.state -ne 'STAGED_FOR_REVIEW') {
    throw ('BAD_STAGE_STATUS:'+$manifest.state)
  }
  $report=@(Import-Csv (Join-Path $releaseRoot 'release-impact.csv'))
  foreach ($expected in @('LIVE_ONLY_PRESERVED','MERGED_CLEAN','NEW_STAGED',
    'LIVE_MANIFEST_PRESERVED','RETIRED_MODULE_REMOVED')) {
    if (-not @($report | Where-Object {$_.Status -eq $expected}).Count) {
      throw ('MISSING_STAGE_CATEGORY:'+$expected)
    }
  }
  $wrongHash=$false
  try {
    $args.ExpectedBackupSha256='0'*64
    & $tool @args | Out-Null
  } catch {
    $wrongHash=$_.Exception.Message -match 'BACKUP_TAMPERED'
  }
  if (-not $wrongHash) {throw 'BACKUP_SHA_GUARD_FAILED'}
  Write-Host 'STAGING_ENGINE_TESTS=PASS'
  Write-Host 'LIVE_ONLY_FILES_PRESERVED=PASS'
  Write-Host 'THREE_WAY_MERGE=PASS'
  Write-Host 'NEW_FILES_STAGED=PASS'
  Write-Host 'LIVE_MANIFEST=PASS'
  Write-Host 'PAYMENT_MODULES_RETIRED=PASS'
  Write-Host 'BACKUP_GUARD=PASS'
  Write-Host 'REMOTE_WRITES=NONE'
} finally {
  if(Test-Path -LiteralPath $workspace) {Remove-Item -LiteralPath $workspace -Recurse -Force}
}
