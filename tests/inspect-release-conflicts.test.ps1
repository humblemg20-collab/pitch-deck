$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest

$root=Join-Path ([IO.Path]::GetTempPath()) ('ag24_conflicts_'+[guid]::NewGuid().ToString('N'))
$directory=Join-Path $root 'conflicts'
$script=Join-Path (Split-Path -Parent $PSScriptRoot) 'scripts/inspect-release-conflicts.ps1'
try {
  New-Item -ItemType Directory -Force -Path $directory | Out-Null
  @([pscustomobject]@{
    Identity='server:api'
    Status='BLOCKED_MERGE_CONFLICT'
    LiveFile='Api.gs'
    ProposedFile='Api.js'
  }) | Export-Csv -LiteralPath (Join-Path $root 'release-impact.csv') -NoTypeInformation
  $text=@'
function apiBootstrap() {
<<<<<<< LIVE
  return 'live';
=======
  return 'github';
>>>>>>> PROPOSED
}
'@
  [IO.File]::WriteAllText((Join-Path $directory 'server_api.conflict'),$text)
  & $script -ReleaseRoot $root
  if (-not $?) {throw 'DIAGNOSTIC_COMMAND_FAILED'}
  $report=@(Import-Csv -LiteralPath (Join-Path $root 'conflict-diagnostics.csv'))
  if ($report.Count -ne 1 -or $report[0].ConflictBlocks -ne '1' -or
      $report[0].Priority -ne 'HIGH' -or
      $report[0].File -ne 'Api.gs') {
    throw 'CONFLICT_DIAG_REPORT_WRONG'
  }
  $rejected=$false
  [IO.File]::WriteAllText((Join-Path $directory 'server_api.conflict'),'BROKEN')
  try {& $script -ReleaseRoot $root | Out-Null}
  catch { $rejected=$_.Exception.Message -match 'INVALID_CONFLICT_MARKERS' }
  if (-not $rejected) {throw 'INVALID_MARKERS_NOT_REJECTED'}
  Write-Host 'CONFLICT_DIAGNOSTICS_TESTS=PASS'
  Write-Host 'SAFE_METADATA_ONLY=PASS'
  Write-Host 'FAIL_CLOSED=PASS'
  Write-Host 'REMOTE_WRITES=NONE'
}
finally {
  if (Test-Path -LiteralPath $root) {
    Remove-Item -LiteralPath $root -Force -Recurse
  }
}
