$ErrorActionPreference = 'Stop'
# Read only the agency's published GTFS. This generates a public, attributed
# stop-pattern extract; no times are used as predictions and no contact data ships.
$source = 'https://go-rts.com/wp-content/uploads/2026/08/RTSGTFS_Fall2026-1.zip'
$response = Invoke-WebRequest -Uri $source -UseBasicParsing -TimeoutSec 30
if ($response.Content.Length -gt 20000000) { throw 'GTFS archive exceeds limit' }
Add-Type -AssemblyName System.IO.Compression
$stream = [IO.MemoryStream]::new([byte[]]$response.Content)
$archive = [IO.Compression.ZipArchive]::new($stream)
function Read-Gtfs($name) {
  $entry = $archive.GetEntry($name)
  if (!$entry -or $entry.Length -gt 30000000) { throw "Missing or oversized $name" }
  $reader = [IO.StreamReader]::new($entry.Open())
  try { $reader.ReadToEnd() | ConvertFrom-Csv } finally { $reader.Dispose() }
}
try {
  $feed = @(Read-Gtfs 'feed_info.txt')[0]
  $stops = @{}
  foreach ($s in (Read-Gtfs 'stops.txt')) {
    $lat = [double]::Parse($s.stop_lat.Trim(),[cultureinfo]::InvariantCulture)
    $lon = [double]::Parse($s.stop_lon.Trim(),[cultureinfo]::InvariantCulture)
    if ($lat -lt 29 -or $lat -gt 30 -or $lon -lt -83 -or $lon -gt -82) { throw 'Unexpected stop coordinates' }
    $stops[$s.stop_id.Trim()] = [ordered]@{id=$s.stop_id.Trim();code=$s.stop_code.Trim();name=$s.stop_name.Trim();description=$s.stop_desc.Trim();lat=$lat;lon=$lon}
  }
  $trips = @{}
  foreach ($t in (Read-Gtfs 'trips.txt')) { $trips[$t.trip_id.Trim()] = @{route=$t.route_id.Trim();direction=$t.direction_id.Trim();headsign=$t.trip_headsign.Trim();times=[Collections.Generic.List[object]]::new()} }
  foreach ($s in (Read-Gtfs 'stop_times.txt')) {
    $t=$trips[$s.trip_id.Trim()]
    if (!$t -or !$stops.ContainsKey($s.stop_id.Trim())) { throw 'Unresolved stop or trip' }
    $t.times.Add(@{sequence=[int]$s.stop_sequence.Trim();stop=$s.stop_id.Trim()})
  }
  $patterns = @{}
  foreach ($id in ($trips.Keys | Sort-Object)) {
    $t=$trips[$id];$sequence=@($t.times | Sort-Object sequence | ForEach-Object {$_.stop})
    if ($sequence.Count -lt 2) { continue }
    $key=$t.route+'|'+$t.direction+'|'+$t.headsign+'|'+($sequence -join ',')
    if (!$patterns.ContainsKey($key)) { $patterns[$key]=[ordered]@{route=$t.route;direction=$t.direction;headsign=$t.headsign;stops=$sequence} }
  }
  $routes=@(Read-Gtfs 'routes.txt' | Sort-Object {[int]$_.route_short_name} | ForEach-Object {
    $r=$_;$items=@($patterns.Values | Where-Object {$_.route -eq $r.route_id.Trim()} | Sort-Object direction,headsign,{ $_.stops -join ',' })
    $i=0;$items=@($items | ForEach-Object { $_['id']=$r.route_id.Trim()+'-'+$i; $i++; $_ })
    [ordered]@{id=$r.route_id.Trim();number=$r.route_short_name.Trim();name=$r.route_long_name.Trim();patterns=$items}
  })
  $data=[ordered]@{source=$source;sourcePage='https://go-rts.com/rts-data/';publisher=$feed.feed_publisher_name;retrievedAt=[datetime]::UtcNow.ToString('o');version=$feed.feed_version;startDate=$feed.feed_start_date;endDate=$feed.feed_end_date;boundary='Static scheduled stop patterns, not live bus locations, running service confirmation, detours, or ETAs.';routes=$routes;stops=@($stops.Values | Sort-Object id)}
  $target=Join-Path $PSScriptRoot '../public/data/rts-stops.json'
  [IO.File]::WriteAllText([IO.Path]::GetFullPath($target),($data | ConvertTo-Json -Depth 12 -Compress),[Text.UTF8Encoding]::new($false))
  Write-Output "Extracted $($data.routes.Count) routes, $($patterns.Count) patterns, and $($data.stops.Count) stops. Feed dates: $($data.startDate) - $($data.endDate)."
} finally { $archive.Dispose();$stream.Dispose() }
