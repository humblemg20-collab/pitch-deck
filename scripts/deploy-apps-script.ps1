<#
Guarded GitHub Actions -> Google Apps Script HEAD.
Never updates a versioned /exec deployment. No credentials appear in output.
#>
[CmdletBinding()]
param(
 [Parameter(Mandatory)][ValidateSet('audit','push')][string]$Mode,
 [Parameter(Mandatory)][string]$ExpectedCommit,
 [string]$RepositoryRoot = (Split-Path -Parent $PSScriptRoot)
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
function Assert-Safe([bool]$Condition,[string]$Message) {
 if (-not $Condition) { throw $Message }
}
function Run-Clasp([string]$Folder,[string[]]$Arguments) {
 Push-Location $Folder
 try {
   & clasp @Arguments
   Assert-Safe ($LASTEXITCODE -eq 0) ('CLASP_FAILED:' + $Arguments[0])
 } finally { Pop-Location }
}
function Inventory([string]$Folder) {
 $map=@{}
 foreach($f in @(Get-ChildItem -LiteralPath $Folder -File)) {
   $ext=$f.Extension.ToLowerInvariant()
   $key=''
   if ($f.Name -ieq 'appsscript.json') {$key='manifest:appsscript'}
   elseif ($ext -in @('.gs','.js')) {$key='server:'+$f.BaseName.ToLowerInvariant()}
   elseif ($ext -eq '.html') {$key='html:'+$f.BaseName.ToLowerInvariant()}
   if (-not $key) { continue }
   Assert-Safe (-not $map.ContainsKey($key)) ('DUPLICATE_SOURCE:'+ $key)
   $content=[IO.File]::ReadAllText($f.FullName)
   $normalized=$content.Replace(([string][char]13+[string][char]10),[string][char]10).Replace([string][char]13,[string][char]10).TrimEnd([char]10)
   $hash=[Security.Cryptography.SHA256]::Create()
   try {$digest=[BitConverter]::ToString($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes($normalized))).Replace('-','')}
   finally {$hash.Dispose()}
   $map[$key]=$digest
 }
 return ,$map
}
$repo=(Resolve-Path -LiteralPath $RepositoryRoot).Path
$expectedBranch='main'
$branch=(& git -C $repo branch --show-current | Out-String).Trim()
$commit=(& git -C $repo rev-parse HEAD | Out-String).Trim()
Assert-Safe ($branch -eq $expectedBranch) 'WRONG_BRANCH'
Assert-Safe ($commit -eq $ExpectedCommit -and $commit -match '^[a-f0-9]{40}$') 'WRONG_SOURCE_COMMIT'
Assert-Safe (-not (& git -C $repo status --porcelain | Out-String).Trim()) 'DIRTY_SOURCE'
Assert-Safe (-not [string]::IsNullOrWhiteSpace($env:CLASPRC_JSON)) 'MISSING_CLASPRC_SECRET'
Assert-Safe (-not [string]::IsNullOrWhiteSpace($env:CLASP_JSON)) 'MISSING_CLASP_JSON_SECRET'
Assert-Safe (-not [string]::IsNullOrWhiteSpace($env:PITCH_SCRIPT_ID)) 'MISSING_PITCH_SCRIPT_ID_VARIABLE'
$config=$env:CLASP_JSON | ConvertFrom-Json
Assert-Safe ($config.scriptId -eq $env:PITCH_SCRIPT_ID) 'TARGET_SCRIPT_ID_MISMATCH'
Assert-Safe (-not $config.rootDir) 'CLASP_ROOT_DIR_UNSUPPORTED'
$work=Join-Path $env:RUNNER_TEMP 'ag24-pitch-release'
$live=Join-Path $work 'live'
New-Item -ItemType Directory -Path $live -Force | Out-Null
[IO.File]::WriteAllText((Join-Path $HOME '.clasprc.json'),$env:CLASPRC_JSON,[Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $live '.clasp.json'),$env:CLASP_JSON,[Text.UTF8Encoding]::new($false))
$env:CLASPRC_JSON=''
$env:CLASP_JSON=''
Write-Host 'REMOTE_BACKUP=START'
Run-Clasp $live @('pull')
Assert-Safe (Test-Path (Join-Path $live 'appsscript.json')) 'REMOTE_MANIFEST_MISSING'
$liveFiles=Inventory $live
Assert-Safe ($liveFiles.Count -ge 10) 'REMOTE_INVENTORY_UNEXPECTED'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip=Join-Path $work 'remote-before.zip'
[IO.Compression.ZipFile]::CreateFromDirectory($live,$zip)
$backupSha=(Get-FileHash $zip -Algorithm SHA256).Hash
Write-Host ('BACKUP_SHA256='+$backupSha)
$stageParent=Join-Path $work 'staging'
& (Join-Path $repo 'scripts/stage-safe-release.ps1') -BackupZip $zip -ExpectedBackupSha256 $backupSha -ExpectedScriptId $env:PITCH_SCRIPT_ID -ExpectedCommit $ExpectedCommit -RepositoryRoot $repo -ExpectedBranch $expectedBranch -OutputRoot $stageParent
Assert-Safe ($?) 'STAGING_ENGINE_FAILED'
$stages=@(Get-ChildItem -LiteralPath $stageParent -Directory)
Assert-Safe ($stages.Count -eq 1) 'STAGING_ROOT_AMBIGUOUS'
$stage=$stages[0].FullName
$manifest=Get-Content -LiteralPath (Join-Path $stage 'manifest.json') -Raw | ConvertFrom-Json
Assert-Safe ($manifest.state -eq 'STAGED_FOR_REVIEW' -and $manifest.blockedIssues -eq 0) 'STAGING_BLOCKED'
$payload=Join-Path $stage 'payload'
$want=Inventory $payload
$retired=@('server:paymentadmin','server:paymentapi','server:paymentconfig','server:paymentsetup','server:paymentstorage','html:app_payment_patch')
foreach($key in $retired){Assert-Safe (-not $want.ContainsKey($key)) ('LEGACY_PAYMENT_PRESENT:'+ $key)}
# Legacy live-only modules must not re-expose public google.script.run calls.
foreach($server in @(Get-ChildItem -LiteralPath $payload -File | Where-Object { $_.Extension -in @('.js','.gs') })) {
 $content=[IO.File]::ReadAllText($server.FullName)
 foreach($match in [regex]::Matches($content,'(?m)^function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(')) {
  $name=$match.Groups[1].Value
  $allowed=($name -eq 'doGet' -or $name -eq 'doPost' -or $name -match '^api[A-Z]\w*
if ($Mode -eq 'audit') {
 Write-Host 'REMOTE_CODE_UNCHANGED=YES'
 Write-Host 'RELEASE_RESULT=AUDIT_PASS'
 exit 0
}
$attempted=$false
try {
 $attempted=$true
 Run-Clasp $payload @('push','--force')
 $verify=Join-Path $work 'verify'
 New-Item -ItemType Directory -Path $verify -Force | Out-Null
 Copy-Item (Join-Path $payload '.clasp.json') (Join-Path $verify '.clasp.json')
 Run-Clasp $verify @('pull')
 $actual=Inventory $verify
 Assert-Safe ($actual.Count -eq $want.Count) 'VERIFICATION_COUNT_MISMATCH'
 foreach($key in $want.Keys){
  Assert-Safe ($actual.ContainsKey($key) -and $actual[$key] -eq $want[$key]) ('VERIFICATION_MISMATCH:'+ $key)
 }
 Write-Host 'PUSH_VERIFY=PASS'
 Write-Host 'VERSIONED_WEBAPP_DEPLOYMENT_UNCHANGED=YES'
 Write-Host 'RELEASE_RESULT=HEAD_PUSH_PASS'
} catch {
 $failure=$_.Exception.Message
 Write-Host ('PUSH_OR_VERIFY_ERROR='+$failure)
 if($attempted) {
  Write-Host 'AUTOMATIC_ROLLBACK=START'
  try {
   Run-Clasp $live @('push','--force')
   Write-Host 'AUTOMATIC_ROLLBACK=PASS'
  } catch {
   Write-Host 'AUTOMATIC_ROLLBACK=FAILED'
   throw ('MANUAL_RECOVERY_REQUIRED:'+ $failure)
  }
 }
 throw ('RELEASE_FAILED:'+ $failure)
}
 -or $name.EndsWith('_'))
  Assert-Safe $allowed ('UNSAFE_PUBLIC_RPC_IN_STAGE:'+ $server.Name+':'+$name)
 }
}

Write-Host 'STAGING_VALIDATION=PASS'
if ($Mode -eq 'audit') {
 Write-Host 'REMOTE_CODE_UNCHANGED=YES'
 Write-Host 'RELEASE_RESULT=AUDIT_PASS'
 exit 0
}
$attempted=$false
try {
 $attempted=$true
 Run-Clasp $payload @('push','--force')
 $verify=Join-Path $work 'verify'
 New-Item -ItemType Directory -Path $verify -Force | Out-Null
 Copy-Item (Join-Path $payload '.clasp.json') (Join-Path $verify '.clasp.json')
 Run-Clasp $verify @('pull')
 $actual=Inventory $verify
 Assert-Safe ($actual.Count -eq $want.Count) 'VERIFICATION_COUNT_MISMATCH'
 foreach($key in $want.Keys){
  Assert-Safe ($actual.ContainsKey($key) -and $actual[$key] -eq $want[$key]) ('VERIFICATION_MISMATCH:'+ $key)
 }
 Write-Host 'PUSH_VERIFY=PASS'
 Write-Host 'VERSIONED_WEBAPP_DEPLOYMENT_UNCHANGED=YES'
 Write-Host 'RELEASE_RESULT=HEAD_PUSH_PASS'
} catch {
 $failure=$_.Exception.Message
 Write-Host ('PUSH_OR_VERIFY_ERROR='+$failure)
 if($attempted) {
  Write-Host 'AUTOMATIC_ROLLBACK=START'
  try {
   Run-Clasp $live @('push','--force')
   Write-Host 'AUTOMATIC_ROLLBACK=PASS'
  } catch {
   Write-Host 'AUTOMATIC_ROLLBACK=FAILED'
   throw ('MANUAL_RECOVERY_REQUIRED:'+ $failure)
  }
 }
 throw ('RELEASE_FAILED:'+ $failure)
}
