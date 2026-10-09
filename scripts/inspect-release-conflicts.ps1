<#
Read-only local conflict diagnostics for AfriGreen24 Pitch release.
Prints only filenames, conflict counts and public function identifiers.
No source text, credentials, API calls or remote modifications.
#>
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ReleaseRoot)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$root=(Resolve-Path -LiteralPath $ReleaseRoot).Path
$report=Join-Path $root 'release-impact.csv'
$directory=Join-Path $root 'conflicts'
if (!(Test-Path -LiteralPath $report) -or !(Test-Path -LiteralPath $directory)) {
  throw 'RELEASE_INPUTS_MISSING'
}
$rows=@(Import-Csv -LiteralPath $report |
  Where-Object {$_.Status -eq 'BLOCKED_MERGE_CONFLICT'})
$evidence=New-Object 'System.Collections.Generic.List[object]'
foreach($row in $rows) {
  $name=$row.Identity.Replace(':','_')+'.conflict'
  $file=Join-Path $directory $name
  if (!(Test-Path -LiteralPath $file -PathType Leaf)) {
    throw ('CONFLICT_FILE_MISSING:'+$name)
  }
  $content=[IO.File]::ReadAllText($file)
  $opening=[regex]::Matches($content,'(?m)^<{7}[ ]+LIVE[^\r\n]*$').Count
  $dividers=[regex]::Matches($content,'(?m)^={7}[ \t]*$').Count
  $closing=[regex]::Matches($content,'(?m)^>{7}[ ]+PROPOSED[^\r\n]*$').Count
  if ($opening -lt 1 -or $opening -ne $dividers -or $opening -ne $closing) {
    throw ('INVALID_CONFLICT_MARKERS:'+$name)
  }
  $names=@([regex]::Matches($content,
    '(?m)^\s*(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(') |
      ForEach-Object {$_.Groups[1].Value} | Sort-Object -Unique)
  $risk=if($row.Identity -match '(?i)api|security|storage|config|setup|payment|mail') {'HIGH'} else {'REVIEW'}
  $evidence.Add([pscustomobject]@{
    File=$row.LiveFile
    ConflictBlocks=$opening
    Priority=$risk
    FunctionNames=($names -join ', ')
  })
}
$out=Join-Path $root 'conflict-diagnostics.csv'
$evidence.ToArray() | Export-Csv -LiteralPath $out -NoTypeInformation -Encoding UTF8
Write-Host '=== AG24 CONFLICT DIAGNOSTICS ==='
Write-Host ('CONFLICT_FILES='+$evidence.Count)
$sum=($evidence.ToArray() | Measure-Object ConflictBlocks -Sum).Sum
Write-Host ('CONFLICT_BLOCKS='+$sum)
foreach($e in $evidence.ToArray()) {
  Write-Host ('FILE='+$e.File+';BLOCKS='+$e.ConflictBlocks+';PRIORITY='+$e.Priority)
}
Write-Host ('DIAGNOSTICS_REPORT='+$out)
Write-Host 'SOURCE_CONTENT_EXPOSED=NO'
Write-Host 'PRODUCTION_UNCHANGED=YES'
Write-Host 'DEPLOYMENT_BLOCKED=YES'
