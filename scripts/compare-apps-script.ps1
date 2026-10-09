<#
Read-only comparison of a verified Pitch Deck Apps Script backup ZIP against
GitHub. No remote writes, no secret output, no production deployment.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$BackupZip,
  [Parameter(Mandatory=$true)][string]$ExpectedBackupSha256,
  [Parameter(Mandatory=$true)][string]$ExpectedScriptId,
  [string]$RepositoryRoot = (Split-Path -Parent $PSScriptRoot),
  [string]$ExpectedBranch = 'feature/asset-engine-v1-20261008',
  [string]$ExpectedCommit = ''
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-AG24([bool]$Condition, [string]$Code) {
  if (-not $Condition) { throw $Code }
}

function Get-AG24-Key([string]$Name) {
  $leaf = [System.IO.Path]::GetFileName($Name)
  $extension = [System.IO.Path]::GetExtension($leaf).ToLowerInvariant()
  if ($leaf -ieq 'appsscript.json') { return 'MANIFEST:appsscript' }
  if ($extension -eq '.js' -or $extension -eq '.gs') {
    return 'SERVER:' + [System.IO.Path]::GetFileNameWithoutExtension($leaf).ToLowerInvariant()
  }
  if ($extension -eq '.html') {
    return 'HTML:' + [System.IO.Path]::GetFileNameWithoutExtension($leaf).ToLowerInvariant()
  }
  return ''
}

function Get-AG24-Hash([string]$Content) {
  $lf = [string][char]10
  $cr = [string][char]13
  $normalized = $Content.Replace($cr + $lf, $lf).Replace($cr, $lf).TrimEnd([char]10)
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($normalized)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return [System.BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-', '')
  } finally { $sha.Dispose() }
}

function Read-AG24-ZipText($Entry) {
  $reader = [System.IO.StreamReader]::new($Entry.Open(), [System.Text.Encoding]::UTF8, $true)
  try { return $reader.ReadToEnd() }
  finally { $reader.Dispose() }
}

function Add-AG24-Source(
  [hashtable]$Inventory, [string]$Name, [string]$Content, [string]$Origin
) {
  $key = Get-AG24-Key $Name
  if (-not $key) { return }
  Assert-AG24 (-not $Inventory.ContainsKey($key)) ('DUPLICATE_IDENTITY:' + $Origin + ':' + $key)
  $Inventory[$key] = [pscustomobject]@{
    Key = $key
    Name = $Name
    Hash = Get-AG24-Hash $Content
    Text = $Content
  }
}

$zipPath = (Resolve-Path -LiteralPath $BackupZip).Path
$rootPath = (Resolve-Path -LiteralPath $RepositoryRoot).Path
Assert-AG24 (Test-Path -LiteralPath (Join-Path $rootPath '.git')) 'REPOSITORY_NOT_GIT'
Assert-AG24 ($ExpectedScriptId -match '^[A-Za-z0-9_-]{20,}$') 'SCRIPT_ID_INVALID'
$archiveHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash
Assert-AG24 ($archiveHash -ieq $ExpectedBackupSha256) 'BACKUP_SHA256_MISMATCH'

$branch = (& git -C $rootPath rev-parse --abbrev-ref HEAD | Out-String).Trim()
Assert-AG24 ($LASTEXITCODE -eq 0) 'GIT_BRANCH_READ_FAILED'
Assert-AG24 ($branch -eq $ExpectedBranch) ('WRONG_BRANCH:' + $branch)
$commit = (& git -C $rootPath rev-parse HEAD | Out-String).Trim()
Assert-AG24 ($LASTEXITCODE -eq 0) 'GIT_COMMIT_READ_FAILED'
if ($ExpectedCommit) {
  Assert-AG24 ($commit -eq $ExpectedCommit) ('UNEXPECTED_COMMIT:' + $commit)
}
$dirty = (& git -C $rootPath status --porcelain | Out-String).Trim()
Assert-AG24 ($LASTEXITCODE -eq 0) 'GIT_STATUS_FAILED'
Assert-AG24 (-not $dirty) 'GIT_WORKTREE_DIRTY'

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
  $configEntry = @($zip.Entries | Where-Object { $_.FullName -eq '.clasp.json' })
  $manifestEntry = @($zip.Entries | Where-Object { $_.FullName -eq 'appsscript.json' })
  Assert-AG24 ($configEntry.Count -eq 1) 'BACKUP_MISSING_CLASP_CONFIG'
  Assert-AG24 ($manifestEntry.Count -eq 1) 'BACKUP_MISSING_MANIFEST'
  $clasp = Read-AG24-ZipText $configEntry[0] | ConvertFrom-Json
  Assert-AG24 ($clasp.scriptId -eq $ExpectedScriptId) 'WRONG_SCRIPT_ID_IN_BACKUP'
  $live = @{}
  foreach ($entry in $zip.Entries) {
    if ($entry.FullName -match '[/\\]') { continue }
    if (-not (Get-AG24-Key $entry.FullName)) { continue }
    Add-AG24-Source $live $entry.FullName (Read-AG24-ZipText $entry) 'BACKUP'
  }
} finally { $zip.Dispose() }

$proposed = @{}
foreach ($file in Get-ChildItem -LiteralPath $rootPath -File) {
  if (-not (Get-AG24-Key $file.Name)) { continue }
  Add-AG24-Source $proposed $file.Name ([System.IO.File]::ReadAllText($file.FullName)) 'GITHUB'
}

$signatures = @('function apiBootstrap','function apiCreateProject',
 'function apiSaveSection','function generateStandardPresentation',
 'function buildStandardDeckContent')
$sourceText = (@($live.Values | ForEach-Object { $_.Text }) -join [string][char]10)
$matchCount = @($signatures | Where-Object {
  $sourceText.IndexOf($_, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
}).Count
Assert-AG24 ($matchCount -ge 3) ('NOT_PITCH:' + $matchCount)

$retired = @('SERVER:paymentadmin','SERVER:paymentapi','SERVER:paymentconfig',
  'SERVER:paymentsetup','SERVER:paymentstorage','HTML:app_payment_patch')
$keys = @($live.Keys) + @($proposed.Keys) | Sort-Object -Unique
$report = @(
  foreach ($key in $keys) {
    $before = $live[$key]
    $after = $proposed[$key]
    $status = if (-not $after -and $retired -contains $key) { 'RETIRED_IN_GITHUB' }
      elseif (-not $after) { 'LIVE_ONLY' }
      elseif (-not $before) { 'NEW_IN_GITHUB' }
      elseif ($before.Hash -eq $after.Hash) { 'UNCHANGED' }
      else { 'MODIFIED' }
    [pscustomobject]@{
      Identity = $key
      Status = $status
      LiveFile = if ($before) { $before.Name } else { '' }
      ProposedFile = if ($after) { $after.Name } else { '' }
      LiveSHA256 = if ($before) { $before.Hash } else { '' }
      ProposedSHA256 = if ($after) { $after.Hash } else { '' }
    }
  }
)
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$csvPath = Join-Path (Split-Path -Parent $zipPath) ('AG24_COMPARE_' + $stamp + '.csv')
$report | Export-Csv -LiteralPath $csvPath -NoTypeInformation -Encoding UTF8

Write-Host '=== AG24 PRE-DEPLOY CODE COMPARISON ===' -ForegroundColor Cyan
Write-Host 'BACKUP_INTEGRITY=PASS' -ForegroundColor Green
Write-Host 'SCRIPT_ID_MATCH=PASS' -ForegroundColor Green
Write-Host "PITCH_SIGNATURES=$matchCount"
Write-Host "GITHUB_COMMIT=$commit"
Write-Host "LIVE_SOURCE_COUNT=$($live.Count)"
Write-Host "GITHUB_SOURCE_COUNT=$($proposed.Count)"
foreach ($kind in @('UNCHANGED','MODIFIED','NEW_IN_GITHUB','LIVE_ONLY','RETIRED_IN_GITHUB')) {
  Write-Host ('{0}={1}' -f $kind, @($report | Where-Object Status -eq $kind).Count)
}
$report | Sort-Object Status,Identity |
  Select-Object Status,LiveFile,ProposedFile | Format-Table -AutoSize
Write-Host "COMPARE_REPORT=$csvPath"
Write-Host 'REMOTE_CODE_UNCHANGED=YES'
Write-Host 'SCRIPT_PROPERTIES_UNCHANGED=YES'
Write-Host 'CLASP_PUSH=NOT_EXECUTED'
Write-Host 'DEPLOYMENT_BLOCKED=YES' -ForegroundColor Yellow
