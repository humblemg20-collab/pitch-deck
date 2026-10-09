<#
AfriGreen24 Pitch Deck — deterministic three-way release staging.
Source of truth: verified live backup ZIP. No remote writes.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$BackupZip,
  [Parameter(Mandatory=$true)][string]$ExpectedBackupSha256,
  [Parameter(Mandatory=$true)][string]$ExpectedScriptId,
  [Parameter(Mandatory=$true)][string]$ExpectedCommit,
  [string]$RepositoryRoot = (Split-Path -Parent $PSScriptRoot),
  [string]$ExpectedBranch = 'feature/asset-engine-v1-20261008',
  [string]$BaseCommit = 'b49030fea33e786abd5a5f09b27b74849df97e45',
  [string]$OutputRoot = ''
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-AG24([bool]$Condition,[string]$Message) {
  if (-not $Condition) { throw $Message }
}
function Get-AG24-Key([string]$Name) {
  $ext = [IO.Path]::GetExtension($Name).ToLowerInvariant()
  if ($Name -ieq 'appsscript.json') {return 'manifest:appsscript'}
  if ($ext -eq '.js' -or $ext -eq '.gs') {
    return 'server:' + [IO.Path]::GetFileNameWithoutExtension($Name).ToLowerInvariant()
  }
  if ($ext -eq '.html') {
    return 'html:' + [IO.Path]::GetFileNameWithoutExtension($Name).ToLowerInvariant()
  }
  return ''
}
function Get-AG24-Inventory([string]$Folder) {
  $table = @{}
  foreach ($f in @(Get-ChildItem -LiteralPath $Folder -File)) {
    $key = Get-AG24-Key $f.Name
    if (-not $key) {continue}
    Assert-AG24 (-not $table.ContainsKey($key)) ('DUPLICATE_SOURCE_FILE:'+$key)
    $table[$key] = $f
  }
  return ,$table
}
function Save-AG24-Blob([string]$Repo,[string]$Revision,[string]$Name,[string]$Target) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = 'git'
  $psi.WorkingDirectory = $Repo
  $psi.Arguments = 'show "' + $Revision + ':' + $Name + '"'
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $psi
  Assert-AG24 ($process.Start()) 'GIT_BLOB_START_FAILED'
  $file = [IO.File]::Create($Target)
  try { $process.StandardOutput.BaseStream.CopyTo($file) }
  finally { $file.Dispose() }
  $stderr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()
  Assert-AG24 ($process.ExitCode -eq 0) ('GIT_BLOB_FAILED:'+$Name+':'+$stderr)
  $process.Dispose()
}
function Get-AG24-GlobalSymbols([string]$Text) {
  $matches = [regex]::Matches($Text,'(?m)^(?:function|const|let|var)[ \t]+([A-Za-z_$][A-Za-z0-9_$]*)[ \t]*(?:[=(]|$)')
  return @($matches | ForEach-Object {$_.Groups[1].Value})
}

$zipPath = (Resolve-Path -LiteralPath $BackupZip).Path
$repo = (Resolve-Path -LiteralPath $RepositoryRoot).Path
Assert-AG24 ($ExpectedScriptId -match '^[A-Za-z0-9_-]{20,}$') 'INVALID_SCRIPT_ID'
Assert-AG24 ($ExpectedCommit -match '^[a-f0-9]{40}$') 'INVALID_GIT_COMMIT'
Assert-AG24 ($BaseCommit -match '^[a-f0-9]{40}$') 'INVALID_BASE_COMMIT'
Assert-AG24 ((Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash -ieq $ExpectedBackupSha256) 'BACKUP_TAMPERED'
Assert-AG24 (Test-Path -LiteralPath (Join-Path $repo '.git')) 'GIT_CLONE_MISSING'
$branch = (& git -C $repo rev-parse --abbrev-ref HEAD | Out-String).Trim()
Assert-AG24 ($LASTEXITCODE -eq 0 -and $branch -eq $ExpectedBranch) ('WRONG_BRANCH:'+$branch)
$head = (& git -C $repo rev-parse HEAD | Out-String).Trim()
Assert-AG24 ($LASTEXITCODE -eq 0 -and $head -eq $ExpectedCommit) ('UNEXPECTED_COMMIT:'+$head)
$dirty = (& git -C $repo status --porcelain | Out-String).Trim()
Assert-AG24 ($LASTEXITCODE -eq 0 -and -not $dirty) 'DIRTY_REPOSITORY'
& git -C $repo cat-file -e ($BaseCommit + '^{commit}') 2>&1 | Out-Null
Assert-AG24 ($LASTEXITCODE -eq 0) 'BASE_COMMIT_UNAVAILABLE'
$baseFiles = @(& git -C $repo ls-tree -r --name-only $BaseCommit)
Assert-AG24 ($LASTEXITCODE -eq 0) 'BASE_TREE_UNAVAILABLE'

if (-not $OutputRoot) {
  $OutputRoot = Join-Path (Split-Path -Parent $zipPath) 'RELEASE_STAGING'
}
New-Item -ItemType Directory -Force -Path $OutputRoot | Out-Null
$timestamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$releaseRoot = Join-Path $OutputRoot ('AG24_PITCH_' + $timestamp)
$payload = Join-Path $releaseRoot 'payload'
$temp = Join-Path $releaseRoot 'temp'
$conflicts = Join-Path $releaseRoot 'conflicts'
foreach ($dir in @($payload,$temp,$conflicts)) {
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
}
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::ExtractToDirectory($zipPath,$payload)

$claspPath = Join-Path $payload '.clasp.json'
Assert-AG24 (Test-Path -LiteralPath $claspPath) 'MISSING_CLASP_IN_BACKUP'
$clasp = Get-Content -LiteralPath $claspPath -Raw | ConvertFrom-Json
Assert-AG24 ($clasp.scriptId -eq $ExpectedScriptId) 'BACKUP_TARGET_MISMATCH'
Assert-AG24 (Test-Path -LiteralPath (Join-Path $payload 'appsscript.json')) 'MISSING_LIVE_MANIFEST'

$live = Get-AG24-Inventory $payload
$proposed = Get-AG24-Inventory $repo
$results = New-Object 'System.Collections.Generic.List[object]'
# Retire payment code only in the isolated staging copy, never from the live script
# or from historical Google Sheets payment records.
$retired = @(
  'server:paymentadmin',
  'server:paymentapi',
  'server:paymentconfig',
  'server:paymentsetup',
  'server:paymentstorage',
  'html:app_payment_patch'
)
foreach ($key in $retired) {
  Assert-AG24 (-not $proposed.ContainsKey($key)) ('RETIRED_MODULE_REINTRODUCED:' + $key)
  if ($live.ContainsKey($key)) {
    $retiredFile = $live[$key]
    Remove-Item -LiteralPath $retiredFile.FullName -Force
    [void]$live.Remove($key)
    $results.Add([pscustomobject]@{
      Status='RETIRED_MODULE_REMOVED';Identity=$key;Live=$retiredFile.Name;GitHub=''
    })
  }
}
foreach ($item in @($proposed.GetEnumerator() | Sort-Object Key)) {
  $key = $item.Key
  $f = $item.Value
  if ($key -eq 'manifest:appsscript') {
    $results.Add([pscustomobject]@{Status='LIVE_MANIFEST_PRESERVED';Identity=$key;Live='appsscript.json';GitHub='appsscript.json'})
    continue
  }
  if (-not $live.ContainsKey($key)) {
    Copy-Item -LiteralPath $f.FullName -Destination (Join-Path $payload $f.Name)
    $results.Add([pscustomobject]@{Status='NEW_STAGED';Identity=$key;Live='';GitHub=$f.Name})
    continue
  }
  $old = $live[$key]
  $same = (Get-FileHash -LiteralPath $old.FullName -Algorithm SHA256).Hash -eq
          (Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash
  if ($same) {
    $results.Add([pscustomobject]@{Status='UNCHANGED';Identity=$key;Live=$old.Name;GitHub=$f.Name})
    continue
  }
  if (-not ($baseFiles -contains $f.Name)) {
    $results.Add([pscustomobject]@{Status='BLOCKED_NO_COMMON_BASE';Identity=$key;Live=$old.Name;GitHub=$f.Name})
    continue
  }
  $base = Join-Path $temp ($key.Replace(':','_')+'.base')
  Save-AG24-Blob $repo $BaseCommit $f.Name $base
  $candidate = Join-Path $temp ($key.Replace(':','_')+'.merged')
  Copy-Item -LiteralPath $old.FullName -Destination $candidate
  & git -C $repo merge-file -L LIVE -L BASE -L PROPOSED -- $candidate $base $f.FullName 2>&1 | Out-Null
  $exitCode = $LASTEXITCODE
  if ($exitCode -eq 0) {
    Copy-Item -LiteralPath $candidate -Destination $old.FullName -Force
    $results.Add([pscustomobject]@{Status='MERGED_CLEAN';Identity=$key;Live=$old.Name;GitHub=$f.Name})
  } elseif ($exitCode -eq 1) {
    Copy-Item -LiteralPath $candidate -Destination (Join-Path $conflicts ($key.Replace(':','_')+'.conflict'))
    $results.Add([pscustomobject]@{Status='BLOCKED_MERGE_CONFLICT';Identity=$key;Live=$old.Name;GitHub=$f.Name})
  } else {
    throw ('GIT_MERGE_ERROR:'+$key+':'+$exitCode)
  }
}

$liveKeys = @($live.Keys)
foreach ($key in $liveKeys) {
  if (-not $proposed.ContainsKey($key)) {
    $results.Add([pscustomobject]@{Status='LIVE_ONLY_PRESERVED';Identity=$key;Live=$live[$key].Name;GitHub=''})
  }
}

# Apps Script has one shared global namespace across all server-side files.
# Never stage a package with duplicate top-level functions or constants.
$symbols = @{}
foreach ($f in @(Get-ChildItem -LiteralPath $payload -File | Where-Object {
  $_.Extension -in @('.js','.gs')
})) {
  $content = [IO.File]::ReadAllText($f.FullName)
  foreach ($symbol in (Get-AG24-GlobalSymbols $content | Select-Object -Unique)) {
    if (-not $symbols.ContainsKey($symbol)) {$symbols[$symbol] = @()}
    $symbols[$symbol] += $f.Name
  }
}
$collisions = @($symbols.GetEnumerator() | Where-Object {
  @($_.Value | Select-Object -Unique).Count -gt 1
} | Sort-Object Name)
$collisionReport = Join-Path $releaseRoot 'global-symbol-collisions.txt'
@($collisions | ForEach-Object {
  $_.Key + ': ' + ($_.Value -join ', ')
}) | Set-Content -LiteralPath $collisionReport -Encoding UTF8

$csv = Join-Path $releaseRoot 'release-impact.csv'
$results.ToArray() | Export-Csv -LiteralPath $csv -NoTypeInformation -Encoding UTF8
$blocked = @($results | Where-Object {$_.Status -like 'BLOCKED_*'}).Count
if ($collisions.Count -gt 0) {$blocked += $collisions.Count}
$state = if ($blocked -gt 0) {'REQUIRES_RECONCILIATION'} else {'STAGED_FOR_REVIEW'}
$meta = [pscustomobject]@{
  state=$state
  sourceBackupSha256=$ExpectedBackupSha256
  scriptId=$ExpectedScriptId
  baseCommit=$BaseCommit
  featureCommit=$ExpectedCommit
  preservedLiveOnly=@($results | Where-Object Status -eq 'LIVE_ONLY_PRESERVED').Count
  retiredModulesRemoved=@($results | Where-Object Status -eq 'RETIRED_MODULE_REMOVED').Count
  mergedClean=@($results | Where-Object Status -eq 'MERGED_CLEAN').Count
  newFiles=@($results | Where-Object Status -eq 'NEW_STAGED').Count
  blockedIssues=$blocked
  globalSymbolCollisions=$collisions.Count
  deploymentAllowed=$false
}
$meta | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $releaseRoot 'manifest.json') -Encoding UTF8
Write-Host '=== AG24 SAFE RELEASE STAGING ===' -ForegroundColor Cyan
foreach ($group in @($results | Group-Object Status | Sort-Object Name)) {
  Write-Host ($group.Name + '=' + $group.Count)
}
Write-Host ('GLOBAL_SYMBOL_COLLISIONS=' + $collisions.Count)
Write-Host ('BLOCKING_ISSUES=' + $blocked)
Write-Host ('STAGING_STATE=' + $state)
Write-Host ('RELEASE_ROOT=' + $releaseRoot)
Write-Host ('RELEASE_REPORT=' + $csv)
Write-Host ('SYMBOL_REPORT=' + $collisionReport)
Write-Host 'LIVE_ONLY_FILES_PRESERVED=YES'
Write-Host 'PAYMENT_MODULES_RETIRED_IN_STAGING=YES'
Write-Host 'LIVE_MANIFEST_PRESERVED=YES'
Write-Host 'OPENAI_KEY_UNTOUCHED=YES'
Write-Host 'CLASP_PUSH=NOT_EXECUTED'
Write-Host 'PRODUCTION_UNCHANGED=YES'
Write-Host 'DEPLOYMENT_BLOCKED=YES'
